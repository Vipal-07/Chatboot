const express = require('express');
const socketIO = require('socket.io');
const httpServer = createServer(app);
const Communication = require("./models/communicationSchema.js"); 



const io = socketIO(httpServer, {
    cors: {
        origin: '*', // Allow all origins (adjust in production)
        methods: ['GET', 'POST'],
        credentials: true,
    }
});



io.on('connection', async(socket) => {
    console.log('A user connected:', socket.id);
    socket.emit('message', 'Welcome to the chat!');

    const token = socket.handshake.auth.token
    
    const user = await getUserDetailsFromToken(token)
    socket.join(user?._id.toString())


    // new message event

    socket.on('new message',async(data)=>{

        // find the conversation by sender and receiver

        let conversation = await Communication.findOne({
            "$or" : [
                { sender : data?.sender, receiver : data?.receiver },
                { sender : data?.receiver, receiver :  data?.sender}
            ]
        })
        if(!conversation){{
            // create a new conversation
            conversation = await Communication.create({
                sender: data?.sender,
                receiver: data?.receiver,
            });
        }

        // 
         io.to(data?.sender).emit('message',getConversationMessage?.messages || [])
        io.to(data?.receiver).emit('message',getConversationMessage?.messages || [])
        }
    })
    

    // 

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    })
});