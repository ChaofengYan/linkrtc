//dialogue模块用于p2p之间的在线用户管理，和消息、文件和画板等数据的传递（广播或定向发送）
//（future）客户端离线存储
// 模块的宽度为给定容器的20%，最小宽度为200px
var RTCat = RTCat || {};
RTCat.dialogue = (function () {
    //------模块作用域变量---开始--------
    var
        configMap = {
            main_html: String() 
			+ '<div id="dialogue">'
			+ '<ul id="online" class="nav nav-pills nav-stacked" style="float:left"><li class="active"><a id="all" href="#content-all">所有人</a></li><li><a id="xiaoming" href="#content-xiaoming">小名</a></li></ul>'
			+ '<div id="dataChange" style="float: left;">'
				+'<div id="talkTo">所有人</div>'
				+'<div class="tab-content">'
					+'<div class="tab-pane active" id="content-all">这里是广播的信息</div>'
				+'</div>'				
				+'<div id="tab-bottom">'
					+'<div id="dataForm" style="display:none"><button class="btn btn-primary">图片</button><button class="btn btn-primary">文件</button><button class="btn btn-primary">画板</button></div>'
					+'<input type="text" id="msgcontent"></input><button id="send-add" class="btn btn-primary">+</button>'
				+'</div>'
			+ '</div>'
			,
            settabel_map: {}
        },
        stateMap = {$container : null},
        domMap = {},
        setdomMap,
		//当前在线的客户端，键为sockId,值为昵称
		onlineClient ={'all':'所有人啦','xiaoming':'小名'},
		//当前对话的客户端sockId，广播为'all'
		talkTo = 'all'
		;
    //------模块作用域变量---结束--------

    //------DOM操作---开始--------
	//构建jquery选择dom树
	
    setdomMap = function () {
        var $container = stateMap.$container;
        domMap = {
            $container: $container,
			$dialogue : $container.find('#dialogue'),
			$online : $container.find('#online'),
			$onlineLi : $container.find('#online li a'),
			$dataChange : $container.find('#dataChange'),
			$talkTo : $container.find('#talkTo'),
			$tabContent : $container.find('.tab-content'),
			$tabBottom : $container.find('#tab-bottom'),
			$msgcontent : $container.find('#msgcontent'),
			$dataForm : $container.find('#dataForm'),
			$sendAdd : $container.find('#send-add')
        };
    };
	

	
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
		onClickChoose = function (){
		var msg = domMap.$msgcontent.val();
		if(msg){
			p2p.send(talkTo,msg);
			$('#content-'+talkTo).append('<p>'+msg+'</p>');
			return;
			}
		domMap.$dataForm.toggle();		
		}
	
	onChangeState = function (){
		var msg = domMap.$msgcontent.val();
		if(msg){
			domMap.$sendAdd.text('发送');
			}else{
				domMap.$sendAdd.text('+');
				}			
		}
	
	onChangePerson = function (e){
		var socketId = $(this).attr('id'); 
		if(talkTo==socketId) return;
		talkTo=socketId;
		domMap.$talkTo.text(onlineClient[socketId]);
		var id="content-"+socketId;
		if(!$('#'+id)[0]){			
			domMap.$tabContent.append('<div class="tab-pane" id='+id+'>你们可以开始聊天啦~</div>');
			}
		$(this).tab('show');
		}

	
	
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
				//初始化事件处理函数
				domMap.$sendAdd.click(onClickChoose);

				domMap.$msgcontent[0].addEventListener('textInput',onChangeState);
				domMap.$onlineLi.click(onChangePerson);
        return true;
    };

    //返回公共方法
    return {
        configModule: configModule,
        initModule: initModule,

    };
    //------公共方法---结束-------- 

}());
