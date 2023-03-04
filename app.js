let xhr = new XMLHttpRequest();

/**
 * The 'connected' event is sent to your plugin, after the plugin's instance
 * is registered with Stream Deck software. It carries the current websocket
 * and other information about the current environment in a JSON object
 * You can use it to subscribe to events you want to use in your plugin.
 */
$SD.on('connected', (jsonObj) => connected(jsonObj));

function connected(jsn) {
    // Subscribe to the willAppear and other events
    $SD.on('com.qauwvu9.github.pr.action.willAppear', (jsonObj) => action.onWillAppear(jsonObj));
    $SD.on('com.qauwvu9.github.pr.action.keyUp', (jsonObj) => action.onKeyUp(jsonObj));
    $SD.on('com.qauwvu9.github.pr.action.sendToPlugin', (jsonObj) => action.onSendToPlugin(jsonObj));
    $SD.on('com.qauwvu9.github.pr.action.didReceiveSettings', (jsonObj) => action.onDidReceiveSettings(jsonObj));
    $SD.on('com.qauwvu9.github.pr.action.propertyInspectorDidAppear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });
    $SD.on('com.qauwvu9.github.pr.action.propertyInspectorDidDisappear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: red; font-size: 13px;', '[app.js]propertyInspectorDidDisappear:');
    });
};

// ACTIONS

const action = {
    settings:{},
    onDidReceiveSettings: function(jsn) {
        console.log('%c%s', 'color: white; background: red; font-size: 15px;', '[app.js]onDidReceiveSettings:');

        this.settings = Utils.getProp(jsn, 'payload.settings', {});
        this.doSomeThing(this.settings, 'onDidReceiveSettings', 'orange');
        this.updateOpenPRCount(jsn);
    },

    /** 
     * The 'willAppear' event is the first event a key will receive, right before it gets
     * shown on your Stream Deck and/or in Stream Deck software.
     * This event is a good place to setup your plugin and look at current settings (if any),
     * which are embedded in the events payload.
     */

    onWillAppear: function (jsn) {
        console.log("You can cache your settings in 'onWillAppear'", jsn.payload.settings);
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

    onKeyUp: function (jsn) {
        this.doSomeThing(jsn, 'onKeyUp', 'green');

        this.updateOpenPRCount(jsn);

        this.openPRURL(jsn);

    },

    updateOpenPRCount: function(jsn) {
        // Retrieve GitHub API Connection Parameters from Settings
        const baseapiurl = this.settings.baseapiurl;
        const userororg = this.settings.userororg;
        const reponame = this.settings. repo

        // Build the URL for the request
        const url = `${baseapiurl}/repos/${userororg}/${reponame}/pulls?state=open`;

        // Make the API call and process the response
        this.sendRequest(jsn.context, url, (xhr) => {
            let responseJson = JSON.parse(xhr.response);

            var pulls = Object.keys(responseJson).length

            console.log("Set Count", pulls);

            $SD.api.setTitle(jsn.context, pulls);
        });
    },

    sendRequest: function (context, url, callback) {
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Content-Type', `application/vnd.github+json`);
//        xhr.setRequestHeader('Authorization', `Bearer ${githubToken}`);
        xhr.send();

        let self = this;

        xhr.onload = function () {
            if (xhr.status === 200) {
                callback(xhr);
            } else {
                console.log("not 200");
            }
//                self.setState(context, 4).then(() => {
//                    self.setRepoName(context, settings).then(() =>
//                        self.setLastError(context, settings, xhr.response));
//                });
        };

        xhr.onerror = function (e) {
            console.log("onerror!");
//            this.setState(context, 2).then(() =>
//                this.setTitle(context, 'SETTINGS!').then(() =>
//                    this.setLastError(context, settings, xhr.response)));
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
        console.log('%c%s', `color: white; background: ${tagColor || 'grey'}; font-size: 15px;`, `[app.js]doSomeThing from: ${caller}`);
        // console.log(inJsonData);
    }, 


};

