var capturePhoto = (function(app) {
    "use strict";

    app.utils.onPhotoDataSuccess = function (imageData){
        $("#smallImage").attr("style","display:block");

        var source = "data:image/jpeg;base64," + imageData;
        $("#smallImage").attr("src", source);

        localStorage.setItem("myphoto",source);
        var myImage = localStorage.getItem("myphoto");

        $("#smallImage").attr("src", myImage);
    }

    app.utils.onFail = function(message) {
        alert('Failed because: ' + message);
    }

    app.utils.onPhotoURISuccess  = function(imageURI) {
        $("#largeImage").attr("style","display:block");
        $("#largeImage").attr("src", imageURI);
    }

    app.utils.onPhotoFileSuccess = function (imageData) {
        $("#smallImage").attr("style","display:block");
        $("#smallImage").attr("src", imageData);
    }

    return app;
})(capturePhoto);