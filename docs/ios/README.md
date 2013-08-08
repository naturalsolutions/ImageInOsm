== Requirements ==

Application tested on iPhone 3S and 4 so far...

== Development environment ==

Code is currently developed against Cordova 2.5 (PhoneGap).

If you want to contribute to ImageInOsm for iOS platform, please follow the setup process described [in PhoneGap doc](docs.phonegap.com/en/2.5.0/guide_getting-started_ios_index.md.html). You will need to drop your iOS `cordova.js` file in the `assets/www/libs` directory.

After that, you will additionnaly need to install the ChildBrowser plugin. You can download it [on GitHub](https://github.com/alunny/ChildBrowser/tree/4.0.0). After having unpacked it, you can simply copy all the contents of the `src/ios/` directory to your XCode project, under the `plugins/` section. Then, add the following to your `config.xml` in the `<plugins>` sections:

    <plugin name="ChildBrowser" value="ChildBrowserCommand" />

You will find sample configuration along with this file.