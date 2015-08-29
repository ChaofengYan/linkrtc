var RTCat = (function () {
    //------模块作用域变量---开始--------
    var
        configMap = {
            main_html: String() + '<div></div>',
            settabel_map: {}
        },
        stateMap = {},
        domMap = {},
        setdomMap;
    //------模块作用域变量---结束--------

    //------DOM操作---开始--------
    setdomMap = function () {
        var $container = stateMap.$container;
        domMap = {
            $container: $container
        };
    };
    //------DOM操作---结束--------

    //------事件处理程序---开始--------

    //------事件处理程序---结束-------- 

    //------公共方法---开始--------
    //公共方法/configModule/
    //目的:接收自定义配置
    //参数:键值对对象
    // *input_map
    //返回:true
    configModule = function (input_map) {

    };

    //公共方法/initModule/
    //目的:初始化模块
    //参数:DOM对象
    // *$container
    //返回:true
    initModule = function ($container) {
        //    $container.html(configMap.main_html);
        //    stateMap.$container = $container;
        //    setdomMap();
        RTCat.shell.initModule();
        return true;
    };

    //返回公共方法
    return {
        initModule: initModule
    };
    //------公共方法---结束-------- 

}());

/**********************************************************/
/*                                                        */
/*                       事件处理器                       */
/*                                                        */
/**********************************************************/
var $ = $ ||{};
$.gevent = {
    events: {},
    publish: function (eventName, _) {
        var events = this.events[eventName],
            args = Array.prototype.slice.call(arguments, 1),
            i, m;

        if (!events) {
            return;
        }
        for (i = 0, m = events.length; i < m; i++) {
            events[i].apply(null, args);
        }
    },
    subscribe: function (eventName, callback) {
        this.events[eventName] = this.events[eventName] || [];
        this.events[eventName].push(callback);
    }
};
