<!--
Copyright 2013 Natural Solutions

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

Supported platforms
===================

Built for:
* Android 2.3.3 (API Level 10) and later.
* iOS 3 and later.

So far, application has been tested on:
* Sony XPeria J
* Samsung Galaxy Tab 8.9
* Samsung Galaxy Tab2 10.1
* SFR StartTrail II (Android 2.3.6)
* iPhone 3GS
* iPhone 4

Development environment
=======================

Code is currently developed against Cordova 3.0.

If you want to contribute to ImageInOsm, you will need to deploy a development environment. First, install cordova and its dependencies as well as a platform SDK (Android and/or iOS). Then, execute the following commands:

    # Initialize Cordova infrastructure
    cordova create ImageInOsm image.in.osm ImageInOsm
    cd ImageInOsm
    cordova platform add $PLATFORM   # replace $PLATFORM by 'ios' or 'android' depending on your setup
    cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-geolocation.git
    cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-camera.git
    cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-file-transfer.git
    cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-inappbrowser.git

    # Load versionned code
    rm -rf www        # on a windows prompt, replace this by: rmdir /S /Q www
    git init          # git clone would not work in a non empty directory
    git remote add --track master origin git@github.com:NaturalSolutions/ImageInOsm.git
    git pull origin master

    # Load 3rd-party dependencies
    bower install

The official [Cordova doc](http://cordova.apache.org/docs/en/3.0.0/index.html) may be useful.

Notes about dependencies
========================

Dependencies are normally managed with Bower. However, some 3rd-party modules has been customized.

jQuery has been replaced by a custom build of Zepto (lighter with a compatible
API). To update the build (newer version or adding modules), just follow the
[official procedure] (https://github.com/madrobby/zepto#building).

A custom build of OpenLayers has been made. The file listing enabled
components is `ImageInOsm.cfg`. To update the build, follow the guideline in
OpenLayers `build` directory in the source package.

jsOAuth has been patched to integrate PhoneGap special File API.

Minifying JavaScript files
==========================

So far, JavaScript compression is handled manually with Google Closure using
these commands:

    cd www/libs/
    java -jar ../../compiler.jar --js jsOAuth-1.3.1.js --js_output_file jsOAuth-1.3.1.min.js
    java -jar ../../compiler.jar --js spinner.js --js_output_file spinner.min.js
    cd backbone.layoutmanager_0.8.7/
    java -jar ../../../compiler.jar --js backbone.layoutmanager.js --js_output_file backbone.layoutmanager.min.js
    cd ../NS.MediaWikiApiClient
    java -jar ../../../compiler.jar --js client.js --js_output_file client.min.js
    cd ../../js/
    java -jar ../../compiler.jar --js app.js --js map-view.js --js model.js --js router.js --js utilities.js --js view.js --js_output_file ImageInOsm.min.js

To do before releasing a production app
=======================================

Before building APK/IPA for online stores, you will need to manually do the
following:

*   clone the code in a temporary directory and checkout the latest tagged
    version
*   remove all non-minified JS and CSS files
*   update `www/index.html`, point to JS minified files
*   in `www/js/utilities.js`, change the URL of the Wikimedia API, replace:

        'http://test.wikipedia.org/w/api.php'
    by:

        'http://commons.wikimedia.org/w/api.php'
* in `www/config.xml`, also update the domain whitelist for the Wikimedia API.

Don't commit that changes, just build your APK/IPA and drop this temporary
workspace.