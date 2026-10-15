const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'tests/browser',fullyParallel:true,forbidOnly:!!process.env.CI,retries:process.env.CI?1:0,workers:process.env.CI?2:undefined,
 reporter:[['list'],['html',{open:'never'}]],use:{baseURL:'http://127.0.0.1:8765',trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'npm run serve',url:'http://127.0.0.1:8765',reuseExistingServer:!process.env.CI},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'webkit-mobile',use:{...devices['iPhone 13']}}]
});
