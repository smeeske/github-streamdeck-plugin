//const pulls_xhr = new XMLHttpRequest();
//const issues_xhr = new XMLHttpRequest();

/**
 * The 'connected' event is sent to your plugin, after the plugin's instance
 * is registered with Stream Deck software. It carries the current websocket
 * and other information about the current environment in a JSON object
 * You can use it to subscribe to events you want to use in your plugin.
 */
$SD.on('connected', (jsonObj) => connected(jsonObj));

function connected(jsn) {
    // Subscribe to the willAppear and other events for the Open PRs action
    $SD.on('com.smeeske.github.pr.action.willAppear', (jsonObj) => openPRsAction.onWillAppear(jsonObj));
    $SD.on('com.smeeske.github.pr.action.willDisappear', (jsonObj) => openPRsAction.onWillDisappear(jsonObj));
    $SD.on('com.smeeske.github.pr.action.keyUp', (jsonObj) => openPRsAction.onKeyUp(jsonObj));
    $SD.on('com.smeeske.github.pr.action.sendToPlugin', (jsonObj) => openPRsAction.onSendToPlugin(jsonObj));
    $SD.on('com.smeeske.github.pr.action.didReceiveSettings', (jsonObj) => openPRsAction.onDidReceiveSettings(jsonObj));
    $SD.on('com.smeeske.github.pr.action.propertyInspectorDidAppear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js/openPRsAction]propertyInspectorDidAppear:');
    });
    $SD.on('com.smeeske.github.pr.action.propertyInspectorDidDisappear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: red; font-size: 13px;', '[app.js/openPRsAction]propertyInspectorDidDisappear:');
    });


    // Subscribe to the willAppear and other events for the Open Issues action
    $SD.on('com.smeeske.github.issues.action.willAppear', (jsonObj) => openIssuesAction.onWillAppear(jsonObj));
    $SD.on('com.smeeske.github.issues.action.willDisappear', (jsonObj) => openIssuesAction.onWillDisappear(jsonObj));
    $SD.on('com.smeeske.github.issues.action.keyUp', (jsonObj) => openIssuesAction.onKeyUp(jsonObj));
    $SD.on('com.smeeske.github.issues.action.sendToPlugin', (jsonObj) => openIssuesAction.onSendToPlugin(jsonObj));
    $SD.on('com.smeeske.github.issues.action.didReceiveSettings', (jsonObj) => openIssuesAction.onDidReceiveSettings(jsonObj));
    $SD.on('com.smeeske.github.issues.action.propertyInspectorDidAppear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js/openIssuesAction]propertyInspectorDidAppear:');
    });
    $SD.on('com.smeeske.github.issues.action.propertyInspectorDidDisappear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: red; font-size: 13px;', '[app.js/openIssuesAction]propertyInspectorDidDisappear:');
    });
};

// ACTIONS

const openPRsAction = {

    periodInterval: null,
    timerFlag: false,
    settings:{},

    onDidReceiveSettings: function(jsn) {
        console.log('%c%s', 'color: white; background: red; font-size: 15px;', '[app.js/openPRsAction]onDidReceiveSettings:');
        this.doSomeThing(this.settings, 'onDidReceiveSettings', 'orange');

        this.settings = Utils.getProp(jsn, 'payload.settings', {});

        // clear the existing timer (it will be reset at the updated interval)
        clearInterval(this.periodInterval);
        this.timerFlag = false;

        // retrieve the updated PR count.
        this.updateOpenPRCount(jsn);
    },

    /**
     * The 'willAppear' event is the first event a key will receive, right before it gets
     * shown on your Stream Deck and/or in Stream Deck software.
     * This event is a good place to setup your plugin and look at current settings (if any),
     * which are embedded in the events payload.
     */

    onWillAppear: function (jsn) {
        /**
         * The willAppear event carries your saved settings (if any). You can use these settings
         * to setup your plugin or save the settings for later use.
         * If you want to request settings at a later time, you can do so using the
         * 'getSettings' event, which will tell Stream Deck to send your data
         * (in the 'didReceiveSettings above)
         *
         * $SD.api.getSettings(jsn.context);
        */

        this.settings = jsn.payload.settings;
        this.updateOpenPRCount(jsn);
    },


    /**
     * When an instance of an action ceases to be displayed on Stream Deck, for example, when
     * switching profiles or folders, the plugin will receive a willDisappear event.
     */
    onWillDisappear: function (jsn) {

        clearInterval(this.periodInterval);
        this.timerFlag = false;
    },

    onKeyUp: function (jsn) {
        this.doSomeThing(jsn, 'onKeyUp', 'green');

        this.updateOpenPRCount(jsn);

        this.openPRURL(jsn);

    },

    updateOpenPRCount: function(jsn) {
        // Retrieve GitHub API Connection Parameters from Settings
        const baseapiurl = this.settings.baseapiurl;
        const userororg = this.settings.userororg;
        const reponame = this.settings.repo

        // Build the URL for the request
        const url = `${baseapiurl}/repos/${userororg}/${reponame}/pulls?state=open`;

        // Make the API call and process the response
        this.sendRequest(jsn.context, url, (xhr) => {
            //parse the response
            let responseJson = JSON.parse(xhr.response);
            var pulls = Object.keys(responseJson).length

            //update the text
            console.log("Set PR Count", pulls);
            $SD.api.setTitle(jsn.context, pulls);

            //refresh the number of open PRs at the requested interval
            if(!this.timerFlag) {
                const refreshintervalmins = this.settings.refreshinterval;

                // convert refresh interval (in minutes) to milliseconds.  Default to 10 mins.
                let refreshintervalms = 600000;
                if(refreshintervalmins && parseInt(refreshintervalmins) > 0) {
                    refreshintervalms = parseInt(refreshintervalmins) * 60 * 1000;
                }

                this.periodInterval = setInterval(() => this.updateOpenPRCount(jsn), refreshintervalms);
                this.timerFlag = true;
            }
        });



    },

    sendRequest: function (context, url, callback) {
        const xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);
        xhr.setRequestHeader('Content-Type', `application/vnd.github+json`);
        
        const githubtoken = this.settings.githubtoken;
        if(githubtoken && githubtoken != '') {
            xhr.setRequestHeader('Authorization', `Bearer ${githubtoken}`);
        }
        xhr.send();

        let self = this;
        xhr.onload = function () {
            if (xhr.status === 200) {
                callback(xhr);
            } else {
                console.log(xhr.response);
                $SD.api.setTitle(context, "ERR!");
            }
        };

        xhr.onerror = function (e) {
            console.log("onerror!");
            $SD.api.setTitle(context, "SETTINGS!");
        };

    },

    openPRURL: function(jsn) {
        // Retrieve GitHub API Connection Parameters from Settings
        const githuburl = this.settings.githuburl;
        const userororg = this.settings.userororg;
        const reponame = this.settings. repo

        // Build the URL for the request
        const url = `${githuburl}/${userororg}/${reponame}/pulls`;

        $SD.api.openUrl(jsn.context, url);
    },

    onSendToPlugin: function (jsn) {
        /**
         * This is a message sent directly from the Property Inspector
         * (e.g. some value, which is not saved to settings)
         * You can send this event from Property Inspector (see there for an example)
         */

        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            this.doSomeThing({ [sdpi_collection.key] : sdpi_collection.value }, 'onSendToPlugin', 'fuchsia');
        }
    },

    /**
     * This snippet shows how you could save settings persistently to Stream Deck software.
     * It is not used in this example plugin.
     */

    saveSettings: function (jsn, sdpi_collection) {
        console.log('saveSettings:', jsn);
        if (sdpi_collection.hasOwnProperty('key') && sdpi_collection.key != '') {
            if (sdpi_collection.value && sdpi_collection.value !== undefined) {
                this.settings[sdpi_collection.key] = sdpi_collection.value;
                console.log('setSettings....', this.settings);
                $SD.api.setSettings(jsn.context, this.settings);
            }
        }
    },

    /**
     * Finally here's a method which gets called from various events above.
     * This is just an idea on how you can act on receiving some interesting message
     * from Stream Deck.
     */

    doSomeThing: function(inJsonData, caller, tagColor) {
        console.log('%c%s', `color: white; background: ${tagColor || 'grey'}; font-size: 15px;`, `[app.js/openPRsAction]doSomeThing from: ${caller}`);
    },


};

const openIssuesAction = {

    periodInterval: null,
    timerFlag: false,
    settings:{},


    onDidReceiveSettings: function(jsn) {
        console.log('%c%s', 'color: white; background: red; font-size: 15px;', '[app.js/openIssuesAction]onDidReceiveSettings:');
        this.doSomeThing(this.settings, 'onDidReceiveSettings', 'orange');

        this.settings = Utils.getProp(jsn, 'payload.settings', {});

        // clear the existing timer (it will be reset at the updated interval)
        clearInterval(this.periodInterval);
        this.timerFlag = false;

        // retrieve the updated PR count.
        this.updateOpenIssuesCount(jsn);
    },

    /**
     * The 'willAppear' event is the first event a key will receive, right before it gets
     * shown on your Stream Deck and/or in Stream Deck software.
     * This event is a good place to setup your plugin and look at current settings (if any),
     * which are embedded in the events payload.
     */

    onWillAppear: function (jsn) {
        /**
         * The willAppear event carries your saved settings (if any). You can use these settings
         * to setup your plugin or save the settings for later use.
         * If you want to request settings at a later time, you can do so using the
         * 'getSettings' event, which will tell Stream Deck to send your data
         * (in the 'didReceiveSettings above)
         *
         * $SD.api.getSettings(jsn.context);
        */
        this.settings = jsn.payload.settings;
        this.updateOpenIssuesCount(jsn);
    },


    /**
     * When an instance of an action ceases to be displayed on Stream Deck, for example, when
     * switching profiles or folders, the plugin will receive a willDisappear event.
     */
    onWillDisappear: function (jsn) {

        clearInterval(this.periodInterval);
        this.timerFlag = false;
    },

    onKeyUp: function (jsn) {
        this.doSomeThing(jsn, 'onKeyUp', 'green');

        this.updateOpenIssuesCount(jsn);

        this.openIssuesURL(jsn);

    },

    updateOpenIssuesCount: function(jsn) {
        // Retrieve GitHub API Connection Parameters from Settings
        const baseapiurl = this.settings.baseapiurl;
        const userororg = this.settings.userororg;
        const reponame = this.settings.repo

        // Build the URL for the request
        const url = `${baseapiurl}/repos/${userororg}/${reponame}/issues?state=open`;

        // Make the API call and process the response
        this.sendRequest(jsn.context, url, (xhr) => {
            //parse the response
            let responseJson = JSON.parse(xhr.response);
            var issues = Object.keys(responseJson).length

            //update the text
            console.log("Set Issue Count", issues);
            $SD.api.setTitle(jsn.context, issues);

            //refresh the number of open PRs at the requested interval
            if(!this.timerFlag) {
                const refreshintervalmins = this.settings.refreshinterval;

                // convert refresh interval (in minutes) to milliseconds.  Default to 10 mins.
                let refreshintervalms = 600000;
                if(refreshintervalmins && parseInt(refreshintervalmins) > 0) {
                    refreshintervalms = parseInt(refreshintervalmins) * 60 * 1000;
                }

                this.periodInterval = setInterval(() => this.updateOpenIssuesCount(jsn), refreshintervalms);
                this.timerFlag = true;
            }
        });



    },

    sendRequest: function (context, url, callback) {
        const xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);
        xhr.setRequestHeader('Content-Type', `application/vnd.github+json`);

        const githubtoken = this.settings.githubtoken;
        if(githubtoken && githubtoken != '') {
            xhr.setRequestHeader('Authorization', `Bearer ${githubtoken}`);
        }
        xhr.send();

        let self = this;

        xhr.onload = function () {
            if (xhr.status === 200) {
                callback(xhr);
            } else {
                console.log(xhr.response);
                $SD.api.setTitle(context, "ERR!");
            }
        };

        xhr.onerror = function (e) {
            console.log("onerror!");
            $SD.api.setTitle(context, "SETTINGS!");
        };

    },

    openIssuesURL: function(jsn) {
        // Retrieve GitHub API Connection Parameters from Settings
        const githuburl = this.settings.githuburl;
        const userororg = this.settings.userororg;
        const reponame = this.settings. repo

        // Build the URL for the request
        const url = `${githuburl}/${userororg}/${reponame}/issues`;

        $SD.api.openUrl(jsn.context, url);
    },

    onSendToPlugin: function (jsn) {
        /**
         * This is a message sent directly from the Property Inspector
         * (e.g. some value, which is not saved to settings)
         * You can send this event from Property Inspector (see there for an example)
         */

        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            this.doSomeThing({ [sdpi_collection.key] : sdpi_collection.value }, 'onSendToPlugin', 'fuchsia');
        }
    },

    /**
     * This snippet shows how you could save settings persistently to Stream Deck software.
     * It is not used in this example plugin.
     */

    saveSettings: function (jsn, sdpi_collection) {
        console.log('saveSettings:', jsn);
        if (sdpi_collection.hasOwnProperty('key') && sdpi_collection.key != '') {
            if (sdpi_collection.value && sdpi_collection.value !== undefined) {
                this.settings[sdpi_collection.key] = sdpi_collection.value;
                console.log('setSettings....', this.settings);
                $SD.api.setSettings(jsn.context, this.settings);
            }
        }
    },

    /**
     * Finally here's a method which gets called from various events above.
     * This is just an idea on how you can act on receiving some interesting message
     * from Stream Deck.
     */

    doSomeThing: function(inJsonData, caller, tagColor) {
        console.log('%c%s', `color: white; background: ${tagColor || 'grey'}; font-size: 15px;`, `[app.js/openIssuesAction]doSomeThing from: ${caller}`);
    },


};
