"use strict";

// ----------------------------------------------- Query utilities------------------------------------------ //

function runQuery(query , param) {
    return $.Deferred(function (d) {
        app.db.transaction(function (tx) {
            tx.executeSql(query, param, 
            successWrapper(d), failureWrapper(d));
        });
    });
};

function successWrapper(d) {
    return (function (tx, data) {
        //console.log('wsuccessWrapper');
        d.resolve(data)
    })
};

function failureWrapper(d) {
    return (function (tx, error) {
       console.log('failureWrapper');
       console.log(error);
        d.reject(error)
    })
};

