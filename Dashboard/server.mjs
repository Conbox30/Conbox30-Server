import { exec, execSync } from 'child_process';
import express from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';

const app = express();
app.set('trust proxy', true);
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static('login'))

app.get('/', (req, res) => {
    res.sendFile(path.resolve('login/index.html'));
});
app.get('/dashboard.html', (req, res)=>{
    res.send('You cant not login wiht get')
})
app.get('/dashboard', (req, res)=>{
    res.send('You cant not login wiht get')
})
app.post('/dashboard', (req,res)=>{
    let username = req.body.name;
    let pw = req.body.password;

    //pw and name
    const ADMIN_USER = process.env.ADMIN_USER || 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASS || 'admin1234';

    if(username === ADMIN_USER  && pw === ADMIN_PASS ){
        res.sendFile(path.resolve('dashboard.html'));
        const logMessage = `[${new Date().toISOString()}] successful login from IP: ${req.ip}\n`;
        fs.appendFile('log.txt', logMessage, (err) => {
            if (err) console.error('Error been write Error:', err);
        });
    }
    else{
        const logMessage = `[${new Date().toISOString()}] incorrect login from IP: ${req.ip}\n`;
        fs.appendFile('log.txt', logMessage, (err) => {
            if (err) console.error('Error been write Error:', err);
        });
        res.send('Password or Username was wrong!')
    }
});
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

    res.json({
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
        disk: diskInfo
    });
}); 

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

app.listen(port, '0.0.0.0', () => {
    console.log('Dashboard was running!');
});
