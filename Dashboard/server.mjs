import { exec, execSync } from 'child_process';
import express from 'express';
import session from 'express-session';
import os from 'os';
import path from 'path';
import fs from 'fs';

const app = express();
app.set('trust proxy', true);
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static('login'))

//Session Settings
app.use(session({
    secret: 'conboxkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 60 * 1000,
        httpOnly: true
    } 
}));

app.use('/api/', (req, res, next) => {
    if(!req.session.authenticated) {
        return res.status(403).json({error: 'Unauthorized'});
    }
    next();
})

app.get('/', (req, res) => {
    if(req.session.authenticated) {
        return res.redirect('/dashboard');
    }

    res.sendFile(path.resolve('login/index.html'));
});
app.get('/dashboard.html', (req, res)=>{
    res.redirect('/dashboard')
})
app.get('/dashboard', (req, res)=>{
    if(!req.session.authenticated){
        return res.redirect('/index.html');
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.sendFile(path.resolve('dashboard.html'));  
})
//login
app.post('/dashboard', (req,res)=>{
    let username = req.body.name;
    let pw = req.body.password;

    //pw and name
    const ADMIN_USER = process.env.ADMIN_USER || //your username;
    const ADMIN_PASS = process.env.ADMIN_PASS || //your password;

    if(username === ADMIN_USER  && pw === ADMIN_PASS ){
        req.session.authenticated = true;
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        
        const logMessage = `[${new Date().toISOString()}] successful login from IP: ${req.ip}\n`;
        fs.appendFile('log.txt', logMessage, (err) => {
            if (err) console.error('Error been write Error:', err);
        });

        return res.redirect('/dashboard');
    }
    else{
        const logMessage = `[${new Date().toISOString()}] incorrect login from IP: ${req.ip}, Username: ${req.body.name}, Password: ${req.body.password} \n`;
        fs.appendFile('log.txt', logMessage, (err) => {
            if (err) console.error('Error been write Error:', err);
        });

        res.sendFile(path.resolve('error.html'))
    }
});
//logout
app.post('/logout', (req,res)=>{
    req.session.destroy((err) => {
        if(err){
            console.error('Logout error:', err)
        };
        res.clearCookie('connect.sid');
        return res.redirect('/');
    });
});
//System info 
app.post('/api/system-info', (req, res) => {
   
    let diskInfo = 'N/A';
    try {
        const dfOutput = execSync('df -h /').toString();
        const lines = dfOutput.trim().split('\n');
        if (lines.length > 1) {
            const parts = lines[1].split(/\s+/);
            diskInfo = `${parts[2]} / ${parts[1]} (${parts[4]})`;
        }
    } catch (e) {
        console.error('Disk read error:', e)
    }
    const ramPercent = (((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(1);

    let temp = 'N/A';
    try {
        const output = execSync("cat /sys/class/thermal/thermal_zone*/temp").toString().trim().split('\n');
        const maxRaw = Math.max(...output.map(v => parseFloat(v) || 0));
        if (maxRaw > 0) {
            temp = `${(maxRaw > 1000 ? maxRaw / 1000 : maxRaw).toFixed(1)} °C`;
        }
    } catch {
        temp = 'N/A';
    }

    //Check Services: SSH, SMB, ...
    let sshstatus = 'stopped';
    let smbstatus = 'stopped';
    //check ssh:
    try{
        const sshCheck = execSync('systemctl is-active ssh').toString().trim();
        if(sshCheck === 'active') sshstatus = 'running🟢';
    } catch(e){
        sshstatus = 'stopped🔴';
    }
    //Check smb:
    try{
        const smbCheck = execSync('systemctl is-active smbd').toString().trim();
        if(smbCheck === 'active') smbstatus = 'running🟢';
    }catch(e){
        smbstatus = 'stopped🔴';
    }

    //If you would like to add anything else here for example, Nginx you can do so at this point.
    
    res.json({
        cpuPercent: os.loadavg()[0].toFixed(2),
        ramPercent: ramPercent,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime(),           
        cpus: os.cpus().length,
        cpuname: os.cpus()[0].model,                 
        hostname: os.hostname(),
        platform: os.platform(),         
        architecture: os.arch(),
        temp: temp,
        disk: diskInfo,
        services: {
            ssh: sshstatus,
            smb: smbstatus,
        },
    });
}); 
//button reboot
app.post('/api/reboot', (req, res) => {
    res.json({ message: 'System has rebooted!' });

    setTimeout(() => {
        exec('sudo /sbin/reboot', (error) => {
            if (error) {
                console.log('Error has been Reboot error:', error);
            }
        });
    }, 2000);
});
//button shutdown
app.post('/api/shutdown', (req, res) => {
    res.json({ message: 'System was Shutdown' });

    setTimeout(() => {
        exec('sudo /sbin/shutdown -h now', (error) => {
            if (error) {
                console.log('Error has been Shutdown error: ', error);
            }
        });
    }, 2000);
});
//server start
app.listen(port, '127.0.0.1', () => {
    console.log('Dashboard was running!');
});
