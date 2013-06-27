== Requirements ==

Built for Android 2.2 Froyo (API Level 8) and later.

Application tested on Sony XPeria J and Samsung Galaxy Tab so far...

== Development environment ==

Code is currently developed against Cordova 2.5 (PhoneGap).

If you want to contribute to ImageInOsm for Android platform, please follow the setup process described [in PhoneGap doc](http://docs.phonegap.com/en/2.5.0/guide_getting-started_android_index.md.html). You will need to drop your Android `cordova.js` file in the `assets/www/libs` directory.

After that, you will additionnaly need to install the ChildBrowser plugin. You can download it [on GitHub](https://github.com/alunny/ChildBrowser/tree/4.0.0). After having unpacked it, you can simply copy the `src/android/ChildBrowser.java` to your ADT project, under the directory `src/com.phonegap.plugins.childBrowser/`. Then, add the following to your `config.xml` in the `<plugins>` sections:

    <plugin name="ChildBrowser" value="com.phonegap.plugins.childBrowser.ChildBrowser"/>

You will find sample manifest and configuration along with this file.