import XTouchController from "xtouch-control";

const controller = new XTouchController();


let startTime = Date.now();

controller.right().setControlButton("SMPTEBeatsButton", "SOLID")

setInterval(() => {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;

    controller.right().setTimecodeDisplay(6, Math.floor(minutes / 10).toString(), false);
    controller.right().setTimecodeDisplay(5, (minutes % 10).toString(), true);
    controller.right().setTimecodeDisplay(4, Math.floor(seconds / 10).toString(), false);
    controller.right().setTimecodeDisplay(3, (seconds % 10).toString(), false);
}, 1000);