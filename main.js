const { Client, Location, Poll, List, Buttons, LocalAuth } = require('./index');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath:'auth'
    }),
    // proxyAuthentication: { username: 'username', password: 'password' },
    puppeteer: { 
        // args: ['--proxy-server=proxy-server-that-requires-authentication.example.com'],
        headless: true,
    }
});

// client initialize does not finish at ready now.

client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

// Pairing code only needs to be requested once
// let pairingCodeRequested = false;
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.initialize();

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', async () => {
    console.log('READY');
    const debugWWebVersion = await client.getWWebVersion();
    console.log(`WWebVersion = ${debugWWebVersion}`);
    client.pupPage.on('pageerror', function(err) {
        console.log('Page error: ' + err.toString());
    });
    // new Promise(() => {
    //     for (let index = 0; index < 1500; index++) {
    //         client.sendMessage('972556779524@c.us', 'מה שלום האוזניים?')
    //     }
    // })

    // await client.pupPage.evaluate(async () => {
    //     console.log('קוד הוזרק לדפדפן!');
    //     Object.keys(window.require('WAWebCollections').Presence._index).forEach(async (a) => {
    //         let user = window.require('WAWebCollections').Presence._index[a]
    //    user.chatstate.on("change:type",async (a, b) => {

    //     console.log(a.__x_id.user, b)
    //     if (b !== "unavailable"){
    //         await client.sendMessage('972584241132@c.us', `${a.__x_id.user} is ${b}`)
    //     }
        
    //    })
    //    })

    // });

    await client.pupPage.exposeFunction('sendMessageToClient', async (userId, message) => {
        await client.sendMessage(`${userId}@c.us`, message);
    });

    await client.pupPage.evaluate(async () => {
        console.log('קוד הוזרק לדפדפן!');
        Object.keys(window.require('WAWebCollections').Presence._index).forEach((a) => {
            let user = window.require('WAWebCollections').Presence._index[a];
            user.chatstate.on("change:type", async (a, b) => {
                console.log(a.__x_id.user, b);
                if (b !== "unavailable") {
                    await window.sendMessageToClient('972584241132', `${a.__x_id.user} is ${b}`);
                }
            });
        });
    });


    client.pupPage.on('error', function(err) {
        console.log('Page error: ' + err.toString());
    });
    
});

client.on('message', async msg => {
    // console.log('MESSAGE RECEIVED', msg.id.fromMe);
    if(msg.body.includes('על מנת')){
        console.log(msg);
        await client.sendMessage(msg.from, 'pong')
        let button = new Buttons('Button body', [{ body: 'bt1' }, { body: 'bt2' }, { body: 'bt3' }], 'title', 'footer');
        // await client.sendMessage('972584241132@c.us', 'pong')
        // await client.sendMessage('972584241132@c.us', button)


    }
    if (msg.body === '!ping reply') {
        // Send a new message as a reply to the current one
        msg.reply('pong');

    } else if (msg.body === '!ping') {
        // Send a new message to the same chat
        client.sendMessage(msg.from, 'pong');

    } else if (msg.body.startsWith('!sendto ')) {
        // Direct send a new message to specific id
        let number = msg.body.split(' ')[1];
        let messageIndex = msg.body.indexOf(number) + number.length;
        let message = msg.body.slice(messageIndex, msg.body.length);
        number = number.includes('@c.us') ? number : `${number}@c.us`;
        let chat = await msg.getChat();
        chat.sendSeen();
        client.sendMessage(number, message);

    } else if (msg.body.startsWith('!subject ')) {
        // Change the group subject
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newSubject = msg.body.slice(9);
            chat.setSubject(newSubject);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body.startsWith('!echo ')) {
        // Replies with the same message
        msg.reply(msg.body.slice(6));
    } else if (msg.body.startsWith('!preview ')) {
        const text = msg.body.slice(9);
        msg.reply(text, null, { linkPreview: true });
    } else if (msg.body.startsWith('!desc ')) {
        // Change the group description
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newDescription = msg.body.slice(6);
            chat.setDescription(newDescription);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body === '!leave') {
        // Leave the group
        let chat = await msg.getChat();
        if (chat.isGroup) {
            chat.leave();
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body.startsWith('!join ')) {
        const inviteCode = msg.body.split(' ')[1];
        try {
            await client.acceptInvite(inviteCode);
            msg.reply('Joined the group!');
        } catch (e) {
            msg.reply('That invite code seems to be invalid.');
        }
    } else if (msg.body.startsWith('!addmembers')) {
        const group = await msg.getChat();
        const result = await group.addParticipants(['number1@c.us', 'number2@c.us', 'number3@c.us']);
        /**
         * The example of the {@link result} output:
         *
         * {
         *   'number1@c.us': {
         *     code: 200,
         *     message: 'The participant was added successfully',
         *     isInviteV4Sent: false
         *   },
         *   'number2@c.us': {
         *     code: 403,
         *     message: 'The participant can be added by sending private invitation only',
         *     isInviteV4Sent: true
         *   },
         *   'number3@c.us': {
         *     code: 404,
         *     message: 'The phone number is not registered on WhatsApp',
         *     isInviteV4Sent: false
         *   }
         * }
         *
         * For more usage examples:
         * @see https://github.com/pedroslopez/whatsapp-web.js/pull/2344#usage-example1
         */
        console.log(result);
    }
});

client.on('message_create', async (msg) => {
    // Fired on all message creations, including your own
    if (msg.fromMe) {
        // do stuff here
    }

    // Unpins a message
    if (msg.fromMe && msg.body.startsWith('!unpin')) {
        const pinnedMsg = await msg.getQuotedMessage();
        if (pinnedMsg) {
            // Will unpin a message
            const result = await pinnedMsg.unpin();
            console.log(result); // True if the operation completed successfully, false otherwise
        }
    }
});
