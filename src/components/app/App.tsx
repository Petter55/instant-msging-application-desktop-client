import React, { useEffect, useState } from 'react';
import { hot } from "react-hot-loader/root";
import { machineId } from 'node-machine-id';

import './App.css';
import io from 'socket.io-client';
import DesktopHeader from './desktop-header/DesktopHeader';
import Home from './home/Home';
import Chat from './chat/Chat';
import Conversation from '../../models/Conversation';
import Message from '../../models/Message';
import User from '../../models/User';
import ChatListContainer from './ChatsListContainer/ChatsListContainer';
import ChatOptions from './ChatOptions/ChatOptions';
import ChatCreationForm from '../../models/ChatCreationForm';
let socket = io("http://localhost:5000");
socket.on('connect', function(){
  console.log("Connected here")
});

enum ChatState {
  OPTIONS,
  OPENED,
  CLOSED
}

interface Display {
  chatState: ChatState
}

interface UserState {
  clientId: string
  name: string
}

function App() {
  const [user, setUser]  = useState<UserState>({clientId:"", name:"guest"});
  const [ display, setDisplay ] = useState<Display>({chatState: ChatState.CLOSED})

  const [ openedConversation, setOpenedConversation ] = useState<Conversation>({
    conversationLink: "",
    users: [],
    messages: []
  })

  const [ conversationList, setConversationList ] = useState<Conversation[]>([])

  useEffect(()=>{
    init()
    return  () => {
      socket.off("get-conversation-list");
      socket.off("conversation-joined");
      socket.off("message-posted");
      socket.off("user-data")
    };
  }, [])


  async function init(){
    let id = ""
    try {
      id = await machineId()
    } catch (error) {
      console.log(error)
    }
    
    setUser({...user, clientId: id})
    
    
    getConversationList(id)
    socket.on("listen-conversation-list",(conversationList:Conversation[])=>{
      console.log("listen-conversation-list")
      setConversationList(conversationList)
    })

    socket.on("user-data",(user:User)=>{
      console.log("user-data")
      console.log(user)
      setUser({clientId: user.clientId, name: user.name})
    })

    socket.on("conversation-joined", (res:Conversation)=>{

      setOpenedConversation(res)
      setDisplay({ chatState: ChatState.OPENED })

      console.log("conversation-joined")
      console.log(JSON.stringify(res, undefined, 4))
    })

    socket.on("message-posted", (res:any)=>{
      console.log("message-posted")
      console.log(res)

      setOpenedConversation(res)
    })
    
  }

  const showNewChatOptions = ()=> {
    setDisplay({chatState: ChatState.OPTIONS })
  }
  
  const createConversation = (chatCreationForm:ChatCreationForm)=> {
    const conv = {
      conversationLink: "",
      messages: [],
      subject: chatCreationForm.subject,
      isPublic: chatCreationForm.isPublic === "true" ? true : false,
      persist: chatCreationForm.persist === "true" ? true : false,
      users: [{
        clientId: user.clientId, 
            name: user.name
      }]
    }

    console.log(JSON.stringify(conv, undefined, 4));
    
    socket.emit("create-conversation", conv)
}

  const postMessage = (message:Message)=> {
    message.sentBy = {
      name: user.name,
      clientId: user.clientId
    }

    console.log("post-message posting conversation");
    console.log(JSON.stringify(message, undefined, 4));
    socket.emit("post-message",{ conversation:openedConversation, message:message })
  }

  const joinConversationByLink = (conversationLink:string)=> {

    console.log("join-conversation");
    console.log(JSON.stringify(conversationLink, undefined, 4));
    socket.emit("join-conversation",{ conversationLink:conversationLink, user: {
      clientId: user.clientId,
      name: user.name
    } })
  }

  const openConversation = (conversationLink:string)=> {

    console.log("get-conversation");
    console.log(JSON.stringify(conversationLink, undefined, 4));
    socket.emit("get-conversation",{conversationLink:conversationLink})

  }

  const getConversationList = (id:string)=> {
    socket.emit("request-conversation-list", {clientId: id, name:user.name})
  }

  const editUsername = (user:User) => {
    console.log("edit-usernmae")
    console.log(user)
    socket.emit("edit-username", user)
    getConversationList(user.clientId)
  }




  return (
    <div className="app-container">
      <DesktopHeader/>
      <div className="app-body">
        { display.chatState === ChatState.OPTIONS ? <ChatOptions createConversation={createConversation}/> : <></>}

        { display.chatState === ChatState.OPENED ?
        <Chat openedConversation={openedConversation} postMessage={postMessage} userId={user.clientId}/> : 
        <></>}

        { display.chatState === ChatState.CLOSED ?
         <Home user={user} showNewChatOptions={showNewChatOptions} editUsername={editUsername} joinConversationByLink={joinConversationByLink}/> 
        : <></>
        }

        {!!conversationList && conversationList.length > 0 ? 
        <ChatListContainer conversations={conversationList} openedConversation={openedConversation} openConversation={openConversation} /> 
        : <></>}
        
      </div>
      
    </div>
  );
}


export default hot(App);
