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
* Samsung Galaxy Tab
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

The official [Cordova doc](http://cordova.apache.org/docs/en/3.0.0/index.html) may be useful.