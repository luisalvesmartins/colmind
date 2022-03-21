const socket = io();
var userId=null;
var lastMapUpdate=null;

function join(){
  // console.log("join")
  socket.emit("join", userId, document.getElementById("txtID").value, mind.getAllData(), lastMapUpdate)
}

socket.on("user-newid",(data)=>{
  // console.log("user-newid", data)
  document.cookie = "user=" + escape(data);
})
socket.on("roomData",(data,lastUpdate)=>{
  // console.log("roomData")
  // console.log(data)
  lastMapUpdate=lastUpdate;
  initMind(data);
})
socket.on("recInst",(data)=>{
  console.log("recInst")
  LastInstReceived=data;
  console.log(data)
  processInstruction(data);
})

function initMind(newData){
  var dat={
        nodeData: {
          id: 'root',
          topic: 'Mind Elixir',
          root: true,
          children:[],
          expanded: true,
        },
        linkData: {},
      };
  if (newData)
      dat=newData;
  let options = {
    el: '#map',
    direction: MindElixir.SIDE,
    data: dat,
    draggable: true, // default true
    contextMenu: true, // default true
    nodeMenu: true, // default true
    keypress: true, // default true
    locale: 'en', // [zh_CN,zh_TW,en,ja,pt] waiting for PRs
    overflowHidden: false, // default false
    primaryLinkStyle: 2, // [1,2] default 1
    primaryNodeVerticalGap: 15, // default 25
    primaryNodeHorizontalGap: 15, // default 65
    contextMenuOption: {
      focus: true,
      link: true
    },
    allowUndo: false,
    before: {
      insertSibling(el, obj) {
        return true
      },
      async addChild(el, obj) {
        await sleep()
        return true
      },
    },
  }

  mind = new MindElixir(options)
  mind.init()

  mind.bus.addListener('operation', operation => {
    //console.log(operation,operation.obj.id, operation.obj.topic)
    if ((operation.name==LastInstReceived.o) && (LastInstReceived.obj.parent==operation.obj.parent) && (LastInstReceived.obj.topic==operation.obj.topic))
    {
      console.log("Ignore") //for now
    }
    else
    {
      let clonedObject = { ...operation.obj };
      console.log(clonedObject)
      if (!clonedObject.root){
        clonedObject.parent=operation.obj.parent.id;
        }
        var sendOperation={o:operation.name,obj:clonedObject}
        console.log(sendOperation)
      socket.emit("operation",document.getElementById("txtID").value, sendOperation);

      socket.emit("updatemap",document.getElementById("txtID").value,mind.getAllData());
    }
    // name: [insertSibling|addChild|removeNode|beginEdit|finishEdit]
    // obj: target
    // name: moveNode
    // obj: {from:target1,to:target2}
  })
}

var updateMap;
function mapRefresh(){
  socket.emit("user-reconnected",userId)
}

function processInstruction(o)
{
  var act=mind.getAllData();
  //console.log("=>" + o.o)
  switch (o.o) {
      case "addChild":
          mind.addChild(MindElixir.E(o.obj.parent),o.obj);
          break;
      case "finishEdit":
          mind.setNodeTopic(MindElixir.E(o.obj.id),o.obj.topic)
        break;
      case "insertSibling":
      case "moveUpNode":
      case "moveDownNode":
      case "removeNode":
      case "editStyle":
      case "editTags":
      case "editIcons":
      case "updateNodeStyle":
      case "updateNodeTags":
      case "updateNodeIcons":
          //Fallback to pull, each case can be handled individually
        updateMap=window.setTimeout(mapRefresh,2000);
          break;
      default:
          break;
  }
}

var LastInstReceived="";
var cks=document.cookie.split(';');
var newUser=true;
var mind;

if(cks.length>0){
    for(var f=0;f<cks.length;f++){
        var pair=cks[f].split('=');
        if (pair[0]=="user"){
            userId=pair[1];
            socket.emit("user-reconnected",userId)
            newUser=false;
            break;
        }
    }
}
if (newUser)
{
    socket.emit("user-new")
}
else
  console.log("UserID:",userId);

initMind();
