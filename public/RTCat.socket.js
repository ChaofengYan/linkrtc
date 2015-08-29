//socket对象
// * ws    - 本地socket连接
// * myId  - 本地socketId,由服务器创建
// * server - 服务器地址，默认为当前域

/**********************************************************/
/*                                                        */
/*                       socket                           */
/*                                                        */
/**********************************************************/
/*--------------------socket开始-----------------------*/
//发布事件
// * socket_open:连接
// * socket_message:接收到消息(非指令信息)
// * socket_error:错误
// * socket_close:连接关闭
// * (以下事件被P2P模块/model模块订阅-指令信息)
// * _peers : 连接候选
// * _ice_candidate : 连接打开
// * _new_peer : 加入stream
// * _remove_peer : 建立数据通道
// * _offer : 数据通道打开
// * _answer : 数据通道接收到数

// 注：所有逻辑处理移至Model模块中

RTCat.socket = (function () {
    //----------------------模块作用域变量---开始------------------
    var
        configMap = {
            settabel_map: {}
        },
        stateMap = {},
        ws,
        myId,
        server = "ws:" + window.location.href.substring(window.location.protocol.length).split('#')[0],
        room = window.location.hash.slice(1)

    ;
    //----------------------模块作用域变量---结束------------------


    //----------------------事件处理程序---开始--------------------

    //----------------------事件处理程序---结束--------------------  


    //------------------------公共方法---开始--------------------

    //公共方法/send/

    ws = new WebSocket(server);

    ws.onopen = function () {
        ws.send(JSON.stringify({
            "eventName": "__join",
            "data": {
                "room": room
            }
        }));
        $.gevent.publish('socket_open', ws);
    };

    ws.onmessage = function (message) {
        var json = JSON.parse(message.data);
        if (json.eventName) {
            //支持以下6个事件
            //_peers, _ice_candidate, _new_peer,  _remove_peer, _offer, _answer
            if (json.eventName == '_peers') { //如果返回“_peers”指令，则提取本地socketId信息
                myId = json.data.you;
            }
            $.gevent.publish(json.eventName, json.data);
        } else {
            $.gevent.publish('socket_message', ws, json);
        }
    };

    ws.onerror = function (error) {
        $.gevent.publish('socket_error', error, ws);
    };

    ws.onclose = function (data) {
        $.gevent.publish('socket_close', [data]);
    };


    send = function (data) {
            ws.send(data);
        }
        //公共方法/configModule/
        //目的:接收自定义配置
        //参数:键值对对象
        // *input_map
        //返回:true
    configModule = function (input_map) {

    };

    //公共方法/initModule/
    //目的:初始化模块
    //参数:socket服务器地址，房间名
    // * server
    //返回:true
    initModule = function () {

        return true;
    };


    //返回公共方法
    //socket包含connect和send两方法
    return {
        configModule: configModule,
        initModule: initModule,
        send: send

    };
    //----------------------公共方法---结束--------------------- 

}());
