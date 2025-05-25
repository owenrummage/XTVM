echo Running XTVM
:runloop
call npx.cmd tsx voicemeter.ts
echo XTVM Closed, Restarting!
goto runloop