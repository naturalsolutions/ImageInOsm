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

If you want to contribute to ImageInOsm for Android platform, you will need to deploy a development environment. First, install cordova and its dependencies as well as a platform SDK (Android and/or iOS). Then, execute the following commands:

    # Initialize Cordova infrastructure
    cordova create ImageInOsm image.in.osm ImageInOsm
    cd ImageInOsm
    cordova platform add android
    cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-geolocation.git
    cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-camera.git
    cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-file-transfer.git
    cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-inappbrowser.git

    # Load versionned code
    rm -rf www        # on a windows prompt, replace this by: rmdir /S /Q www
    git init          # git clone would not work in a non empty directory
    git remote add origin git@github.com:NaturalSolutions/ImageInOsm.git
    git pull origin master

The official [Cordova doc](http://cordova.apache.org/docs/en/3.0.0/index.html) may be useful.