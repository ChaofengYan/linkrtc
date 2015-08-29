//media模块用于显示视频画面（本地和远程）
//自动检测远程视频流个数（最多显示8个），并以规范形式显示
// 模块为方形，宽度为给定容器的80%，最小宽度为400px
var RTCat = RTCat || {};
RTCat.media = (function () {
    //------模块作用域变量---开始--------
    var
        configMap = {
            main_html: String() 
			+ '<div id="videos">'
			+ '<div id="you" style=""></div>'
			+ '<div id="me" style="position:absolute"><video id="myvideo" autoplay></video></div>'
			+ '</div>'
			,
            settabel_map: {}
        },
        stateMap = {$container : null},
        domMap = {},
        setdomMap,
        remoteMediaNum,
		//存放远程视频流，键为socketId，值为stream对象
		remoteStreams = {socketId1:'1',socketId2:'1',socketId3:'1',socketId4:'1',socketId5:'1',socketId6:'1',socketId7:'1',socketId8:'1'}
		;
    //------模块作用域变量---结束--------

    //------DOM操作---开始--------
	//构建jquery选择dom树
	
    setdomMap = function () {
        var $container = stateMap.$container;
        domMap = {
            $container: $container,
			$videos : $container.find('#videos'),
			$you : $container.find('#you'),
			$me : $container.find('#me'),
        };
    };
	
	//动态显示远程视频流，每个视频流均可全屏/全容器显示
	displayRemote = function (stream){
		remoteMediaNum = 8;
		if(remoteMediaNum>0){
			domMap.$me.css({bottom:'10px',left:'10px',height:'33.3%',width:'33.3%'});
			}else{
				domMap.$me.attr('src',URL.createObjectURL(stream));
				domMap.$me.height = domMap.$container.height/2;
			domMap.$me.width = domMap.$container.width/2;
			domMap.$me.css({left:'25%',top:'25%'});
			domMap.$me.append("<p>等待他人加入……</p>");
			domMap.$me.append("<div><p>将以下链接发送给好友：</p><input type='text'></input><button>复制</button></div>");
				}
				
				function addStream(socketId){
					var video = $('<video autoplay></video>');
					domMap.$you.append(video);	
							
			video.attr({
				'id':'you'+socketId,
				'src':URL.createObjectURL(remoteStreams[socketId])
				});
				
				return video;
					}
					
		switch(remoteMediaNum){
			case 1:
			domMap.$you.html("");
			for(socketId in remoteStreams){
			var video = addStream(socketId);
			video.css({height:'100%',width:'100%'});
			}
			return;
			case 2:
			domMap.$you.html("");
			for(socketId in remoteStreams){
				var video = addStream(socketId);
			video.css({height:'50%',width:'50%',float:'left',top:'25%'});
				}
			return;
			case 3:
			domMap.$you.html("");
			for(socketId in remoteStreams){
				var video = addStream(socketId);
			video.css({height:'50%',width:'50%',float:'right'});
				}
			return;
			case 4:
			domMap.$you.html("");
			for(socketId in remoteStreams){
				var video = addStream(socketId);
			video.css({height:'33.3%',width:'33.3%',float:'right',top:'25%'});
				}
			return;
			case 5:
			domMap.$you.html("");
			for(socketId in remoteStreams){
				var video = addStream(socketId);
			video.css({height:'33.3%',width:'33.3%',float:'right',top:'25%'});
				}
			return;
			case 6:
			domMap.$you.html("");
			for(socketId in remoteStreams){
				var video = addStream(socketId);
			video.css({height:'33.3%',width:'33.3%',float:'right'});
				}
			return;
			case 7:
			domMap.$you.html("");
			for(socketId in remoteStreams){
				var video = addStream(socketId);
			video.css({height:'33.3%',width:'33.3%',float:'right'});
				}
			return;
			case 8:
			domMap.$you.html("");
			for(socketId in remoteStreams){
				var video = addStream(socketId);
			video.css({height:'33.3%',width:'33.3%',float:'right'});
				}
			return;		
			}
		}
	
	//操作本地视频流窗口（拖动，关闭等）
	
    //------DOM操作---结束--------

    //------事件处理程序---开始--------
    //订阅事件：
    // * stream_created : 创建本地视频流成功
    // * stream_create_error : 创建本地视频流失败
    // * pc_addstream : 接收到其他用户的视频流
    // * remove_peer : 删除其他用户
    // * 
    // * 
    // * 
	
	//创建本地视频流成功
    $.gevent.subscribe("stream_created", function (stream) {		
		displayRemote(stream);
    });
    //创建本地视频流失败
    $.gevent.subscribe("stream_create_error", function () {
        alert("create stream failed!");
    });

	//接收到其他用户的视频流
    $.gevent.subscribe('pc_addstream', function (stream, socketId) {
		remoteStreams[socketId] = stream;
		displayRemote();

    });
    //删除其他用户
    $.gevent.subscribe('remove_peer', function (socketId) {
		delete remoteStreams[socketId];
        displayRemote();
    });
	
	
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
                stateMap.$container = $container;
				$container.html(configMap.main_html);
                setdomMap();
				displayRemote();
        return true;
    };

    //返回公共方法
    return {
        configModule: configModule,
        initModule: initModule,

    };
    //------公共方法---结束-------- 

}());
