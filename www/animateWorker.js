/*
 * animateWorker.js
 * Author: Joshua Berlin
 * Creates a javaScript thread to produce map points 
 * of the Moon's shadow on the Earth's surface.
 * Last Edit: 10-01-2014
 * 
 */

var ANIMATE_SCALE = 200;
var ANIMATE_INTERVAL = 2000;

/*
 * Initialize the animation worker thread.
 * Called when loading the worker.
 */
function  initWorker()
{
    importScripts("SolarElevation.js");
    importScripts("EclipseCalc.js");
    
    self.addEventListener('message', function(e) 
    {
        var data = e.data;
        switch (data.cmd) 
        {
            case 'shadow':
                drawShadow(data.eclipse);
                break;
            case 'real':
                drawRealShadow(data);
                break;
            default:
                break;
        }
    }, false);
}

function drawRealShadow(msg)    // TODO: Seperate out into different threads for more performance!
{
    var eclipse = new EclipseData(JSON.parse(msg.eclipse));
    var dateOffset = parseInt(msg.dateOffset);
    var penumbraShadow = null;
    var umbraShadow = null;
    var penUmbraStartTime = eclipse.getPenumbraStartTime();
    var penUmbraEndTime = eclipse.getPenumbraEndTime();
    var isTotalorAnnular = false;
    var currentTime = null;
    
    if(     eclipse.type == "Annular" ||
            eclipse.type == "Total" ||
            eclipse.type == "Hybrid")
    {
        isTotalorAnnular = true;
    }
    
    if(isTotalorAnnular)
    {
        var umbraStartTime = eclipse.getUmbraStartTime();
        var umbraEndTime = eclipse.getUmbraEndTime();
    }
    
    if(isNaN(dateOffset))
    {
        dateOffset = 0;
    }
    
    while (true)
    {
        currentTime = new Date();
        currentTime.setTime(currentTime.getTime() + dateOffset);
        
        if(currentTime >= penUmbraStartTime &&
                currentTime <= penUmbraEndTime)
        {
            penumbraShadow = eclipse.drawPenumbraShadow(currentTime);
        }
        
        if(isTotalorAnnular)
        {
            if( currentTime.getTime() >= umbraStartTime && 
                currentTime.getTime() <= umbraEndTime)
            {
                umbraShadow = eclipse.drawUmbraShadow(currentTime);
            }        
        }
        
        postMessage({   'cmd': 'shadow_done', 
                        'pen_shadow': JSON.stringify(penumbraShadow), 
                        'umb_shadow': JSON.stringify(umbraShadow), 
                        'date': currentTime.toUTCString()});
    }
}

function drawShadow(msg)    // TODO: Seperate out into different threads for more performance!
{
    var eclipse = new EclipseData(JSON.parse(msg));
    var penumbraShadow = null;
    var umbraShadow = null;
    var currentTime = null;
    var deltaTime = 0;
    var lastAnimateTime = null;
    var totalDeltaTime = 0;
    var animateDate = null;
    
    var start_time = eclipse.getPenumbraStartTime();
    var end_time = eclipse.getPenumbraEndTime();
    
    if(start_time)
    {
        var isTotalorAnnular = false;

        if (eclipse.type == "Annular" ||
                eclipse.type == "Total" ||
                eclipse.type == "Hybrid")
        {
            isTotalorAnnular = true;
        }

        if (isTotalorAnnular)
        {
            var umbraStartTime = eclipse.getUmbraStartTime();
            var umbraEndTime = eclipse.getUmbraEndTime();
        }
        
        while(true)
        {
            if(lastAnimateTime != null)
            {
		currentTime = new Date();
		deltaTime = currentTime.getTime() - lastAnimateTime.getTime();
            }
            else
            {
		deltaTime = 0;
		totalDeltaTime = 0;
            }
            totalDeltaTime += deltaTime;
            lastAnimateTime = new Date();
            
            animateDate = new Date(start_time.getTime() + (totalDeltaTime * ANIMATE_SCALE));
            
            if(animateDate.getTime() < end_time.getTime())
            {
                penumbraShadow = eclipse.drawPenumbraShadow(animateDate);
                
                if (isTotalorAnnular)
                {
                    
                    if (    animateDate.getTime() >= umbraStartTime.getTime() &&
                            animateDate.getTime() <= umbraEndTime.getTime())
                    {
                        umbraShadow = eclipse.drawUmbraShadow(animateDate);
                    }
                }
             
                postMessage({   'cmd': 'shadow_done', 
                                'pen_shadow': JSON.stringify(penumbraShadow), 
                                'umb_shadow': JSON.stringify(umbraShadow), 
                                'date': animateDate.toGMTString()});
            }
            else
            {
		totalDeltaTime = 0;
		lastAnimateTime = null;
            }
        }
    }
}

initWorker();



