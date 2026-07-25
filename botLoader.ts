import { WASocket } from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

// This function takes a specific user's socket and loads all commands for it
export async function loadBotLogic(sock: WASocket, sessionId: string) {
 console.log(`[BotLoader] Loading plugins for session: ${sessionId.substring(0, 10)}...`);
 
 const pluginsDir = path.join(__dirname, 'plugins');
 if (!fs.existsSync(pluginsDir)) return;
 
 const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
 const activePlugins = new Map();
 
 for (const file of files) {
  try {
   const filePath = path.join(pluginsDir, file);
   const pluginModule = await import(pathToFileURL(filePath).href);
   const commands = pluginModule.default || pluginModule.commands;
   
   if (Array.isArray(commands)) {
    for (const cmd of commands) {
     activePlugins.set(cmd.name, cmd);
    }
   }
  } catch (err) {
   console.error(`[BotLoader] Failed to load plugin ${file}:`, err);
  }
 }
 
 // Listen for messages FOR THIS SPECIFIC USER'S SOCKET
 sock.ev.on('messages.upsert', async ({ messages }) => {
  const msg = messages[0];
  if (!msg.message || msg.key.fromMe) return;
  
  const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
  const prefix = '.'; // Your bot prefix
  
  if (!text.startsWith(prefix)) return;
  
  const commandName = text.slice(prefix.length).split(' ')[0].toLowerCase();
  const args = text.slice(prefix.length).split(' ').slice(1);
  const sender = msg.key.remoteJid!;
  
  const plugin = activePlugins.get(commandName);
  if (plugin) {
   console.log(`[BotLoader] Executing command: ${commandName} for ${sender}`);
   try {
    // Execute the plugin, passing the specific socket, msg, and args
    await plugin.handler({
     sock,
     msg,
     args,
     sender,
     text
    });
   } catch (err) {
    console.error(`[BotLoader] Error executing ${commandName}:`, err);
    await sock.sendMessage(sender, { text: '⚠️ An error occurred while running this command.' });
   }
  }
 });
 
 console.log(`[BotLoader] Successfully loaded ${activePlugins.size} commands for ${sessionId.substring(0, 10)}...`);
}