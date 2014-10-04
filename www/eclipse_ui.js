/* 
 * eclipse_ui.js
 * 
 * Eclipse User Interface JavaScript Library for displaying 
 * Eclipse maps and eclipse local circumstances.
 * Author: Joshua Berlin
 * Last Edited: 09-10-2014
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 3
 * of the License, or (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
*/

var coordInterval = null;
var UPDATE_INTERVAL = 1000;
var current_position = null;
var latitude = 34.0;
var longitude = -118.0;
var altitude = 0;
var metersToFeet = 3.28084;
var watchPosition = null;
var bManualLocation = false;
var elevator = null;
var IMGS_FOLDER = 'images/';
var gTimeZone = null;
var gTimeZoneID = null;
var gEclipseTimeZone = null;
var gEclipseTimeZoneID = null;
var geoCoder = null;
var eclipse_elements_url = "data/eclipses/SECOMB.js";
var eclipse_catalog_url = "data/eclipses/catsmall.txt";
var eclipseInfo = null;
var TIME_LOCALE = "en-US";
var selected_eclipse = -1;
var centralCoordinates = [];
var centralPath = null;
var bCenterEclipseMap = true;
var eclipseMap = new EclipseMap();
var bCountDownsShown = false;			// Is the countdown page currently being displayed?
var bAnimating = false;					// Are shadows being animated?
var drawWorker = null;				// Animation background thread.
var bRealTimeShadow = false;                    // If we are doing a realtime shadow.
var bFirstPageShow = true;              // Triggered to true after first "page show" called.
var dateOffset = 0;                     // Date offset for time travel.
var TIME_TRAVEL_OFFSET = 10000;         // Offset before time travel click.  Example: If you click first contact, you start 10 seconds before actual first contact.
var popMessage = "";                    // Load with message to show after page transistion.
var bGoodFirstPostion = false;          // Switchs true when we get a good position from IP geolocation.

/* Moon Animation Variables */
var moonPos = null;
var sunPos = null;
var moonInterval = null;
var moonAnimateStartTime = null;
var moonAnimateTime = null;
var moonStopAnimaateTime = null;
var MOON_ANIMATE_INTERVAL = 250;
var MOON_ANIMATE_SCALE = 200;
var bRealTimeMoon = false;

//
// ID's Presaved so we don't traverse the DOM everytime
// Hogs memory but saves CPU
var latID = null;
var longID = null;
var altID = null;
var timeID = null;
var sunDiv = null;
var moonDiv = null;
var headerID = null;

function radToDeg(angleRad)
{
    if (isNaN(angleRad))
    {
        console.log("RAD NAN");
        return 0.0;
    }
    return (180.0 * angleRad / Math.PI);
}

function degToRad(angleDeg)
{
    if (isNaN(angleDeg))
    {
        console.log("DEG NAN");
        return 0.0;
    }
    return (Math.PI * angleDeg / 180.0);
}

function sin(/* Number */ deg)
{
    var ans = Math.sin(degToRad(deg));
    if (isNaN(ans))
    {
        console.log("SIN NAN");
        return 0.0;
    }
    return ans;
}

function cos(/* Number */ deg)
{
    var ans = Math.cos(degToRad(deg));
    if (isNaN(ans))
    {
        console.log("COS NAN");
        return 0.0;
    }
    return ans;
}

// Items getting updated in the background.
// Typically every second, eclipse calculations and
// GPS coordinate info grab.
function backGroundUpdate()
{
    updateCoords();

    if (bCountDownsShown)
    {
        updateCalculations();
    }
}

/*
 * Pops a toast message on the screen, input specified message. 
 * @param {String} msg
 * @returns {undefined}
 */
function toastPop(msg)
{
    $("#toast_msg").html(msg);
        
    $( "#toast" ).popup("open");
    
    setTimeout(function()
    {
        $( "#toast" ).popup("close"); 
    }, 2000);
}

function delayToast(msg)
{
    setTimeout(function(msg)
    {
        toastPop(msg);
    }, 750, msg);
}

function setPopMsg(msg)
{
    popMessage = msg;
}

function getElevation()
{
    if (elevator)
    {
        var locations = [];
        var currentLoc = new google.maps.LatLng(latitude, longitude);

        locations.push(currentLoc);

        var positionalRequest =
            {
                'locations': locations
            };
            
        elevator.getElevationForLocations(positionalRequest, function(results, status)
        {
            if (status == google.maps.ElevationStatus.OK)
            {
                // Retrieve the first result
                if (results[0])
                {
                    altitude = results[0].elevation;
                    
                    if(altitude < -20.0)    // Looks like we might be in the Ocean, lets see!
                    {
                        getGoogleGeocode();
                    }
                }
                else
                {
                    console.log('No elevation results found.');
                }
            }
            else
            {
                console.log('Elevation service failed due to: ' + status);
            }
        });
        
       
    }
}

function getGoogleGeocode()
{
    if (geoCoder)
    {
        var currentLoc = new google.maps.LatLng(latitude, longitude);
        
        geoCoder.geocode({'latLng': currentLoc}, function(results, status)
        {
            if(status == google.maps.GeocoderStatus.OK)
            {
                if(typeof(results[0].address_components[0].types[0]) == "string")
                {
                    if(results[0].address_components[0].types[0] == "country")
                    {
                        console.log("Probably ocean, because just general type of address returned and altitude less than -20.0 meters.")
                        altitude = 0.0;
                    }
                }
                else
                {
                    console.log("Geocoder said it was OK, but no real results.");
                }
                
                console.log("Geocoder results!");
                console.log(results);
            }
            else if(status == google.maps.GeocoderStatus.ZERO_RESULTS)  // Probably in the ocean.
            {
                console.log("Ocean detected because of 'ZERO_RESULTS'");
                altitude = 0.0;
            }
            else
            {
                console.log("Geocode was not successful for the following reason: " + status);
            }
        });
    }
}

function getGoogleTimeZone(latitude, longitude, result)
{
    var current_time = new Date();
    var GOOGLE_TIME_URL = "https://maps.googleapis.com/maps/api/timezone/json?location=";
    var data_out = GOOGLE_TIME_URL + latitude + "," + longitude + "&timestamp=" + Math.round(current_time.getTime() / 1000);
    
    // Get a timezone for current day and time.
    $.getJSON(data_out).done(function(response)
    {
        if (response.status == "OK")
        {
            var offset = Math.round((response.dstOffset + response.rawOffset) / 60.0);
            result(offset, response.timeZoneId);
        }
    }).fail(function() 
    {
        console.log( "Google timezone failure." );
        if(typeof(result) == "function")
        {
            result(null);
        }
    });
    
    // Get the time zone info for the day of the eclipse.
    if (selected_eclipse >= 0)
    {
        current_time = eclipseInfo.getEclipse(selected_eclipse).maxEclipseDate;
        data_out = GOOGLE_TIME_URL + latitude + "," + longitude + "&timestamp=" + Math.round(current_time.getTime() / 1000);
        $.getJSON(data_out).done(function(response)
        {
            if (response.status == "OK")
            {
                gEclipseTimeZone = Math.round((response.dstOffset + response.rawOffset) / 60.0);
                gEclipseTimeZoneID = response.timeZoneId;
            }
            else
            {
                gEclipseTimeZone = null;
                gEclipseTimeZoneID = null;
            }
        }).fail(function()
        {
            gEclipseTimeZone = null;
            gEclipseTimeZoneID = null;
            console.log("Google eclipse timezone failure.");
        });    
    }
}

function onGoogleTimeZone(result, szID)
{
    if(result != null)
    {
	gTimeZone = result;
        gTimeZoneID = szID;
        	
	console.log("Got a timezone: " + gTimeZone + " ID: " + gTimeZoneID);
    }
    else
    {
        gTimeZone = null;
        gTimeZoneID = null;
    }
}

function getPosition()
{
    console.log("Trying to get first position.");
    if (!bManualLocation)
    {
        try
        {
            // navigator.geolocation.getCurrentPosition(onPositionOne, onPosErrorOne, {timeout: 15000, maximumAge: 100});
            navigator.geolocation.getCurrentPosition(onPositionOne, onPosErrorOne, {timeout: 10000});
        }
        catch (e)
        {
            console.log("Error getting first position: " + e.toString());
        }
    }
}

function stopPosition()
{
    if (watchPosition != null)	// Have to do this with Firefox, as a valid watch id is zero.
    {
        navigator.geolocation.clearWatch(watchPosition);
        watchPosition = null;
    }
}

function loadEclipseData()
{
    $.mobile.loading("show",
            {
                text: "Loading eclipse elements...",
                textVisible: true,
                theme: "b"
            });
   
   // TODO: This needs to be threaded.... takes too long.
    eclipseInfo = new Eclipses();

    eclipseInfo.loadEclipseElements(eclipse_elements_url, eclipse_catalog_url, onEclipseLoadComplete, onEclipseLoadError);
}

/*
 * An eclipse was selected from the "Eclipse selector"
 */
function onEclipseClicked(event, ListItems)
{	
	var new_selection = parseInt($(ListItems).attr("eclipse-index"));
        var eclipse_list = $("#eclipse_list");
        var jSelectedEclipse = eclipse_list.children("li").eq(selected_eclipse);

	console.log("Clicked eclipse: " + new_selection);
	
	if(selected_eclipse >= 0)
	{
            jSelectedEclipse.removeClass('ui-body-b');
            jSelectedEclipse.addClass('ui-body-inherit');
            jSelectedEclipse.children("p").css("color", "");
        }
	
	selected_eclipse = new_selection;
        jSelectedEclipse = eclipse_list.children("li").eq(selected_eclipse);
	
	jSelectedEclipse.addClass('ui-body-b');
        jSelectedEclipse.removeClass('ui-body-inherit');
        jSelectedEclipse.children("p").css("color", "white");
        eclipse_list.listview("refresh");
       
        drawEclipseMap();
        getGoogleTimeZone(latitude, longitude, onGoogleTimeZone);
        
        // TODO: Page transition not working here?
        $( ":mobile-pagecontainer" ).pagecontainer( "change", "#countdowns", {'reverse': true} );
}

/*
 * Created data points for drawing on eclipse map.
 */
function drawEclipseMap()
{
	if(selected_eclipse >= 0)
	{
		createMap();
                eclipseMap.clearPaths();
		
		console.log("Drawing eclipse map.");
		
		var centralLine = eclipseInfo.getEclipse(selected_eclipse).drawCentralLine();
		var southernUmbraLine = eclipseInfo.getEclipse(selected_eclipse).drawUmbraLimit(false);
		var northernUmbraLine = eclipseInfo.getEclipse(selected_eclipse).drawUmbraLimit(true);
		var southernPenumbraLine = eclipseInfo.getEclipse(selected_eclipse).drawPenumbralLimit(false);
		var northernPenumbraLine = eclipseInfo.getEclipse(selected_eclipse).drawPenumbralLimit(true);
		var eastEclipseLine = eclipseInfo.getEclipse(selected_eclipse).drawEastWestLimit(false);
		var westEclipseLine = eclipseInfo.getEclipse(selected_eclipse).drawEastWestLimit(true);
		
		if(centralLine)
		{
			console.log("Found: " + centralLine.length + " central line positions.");
		
			eclipseMap.drawCentralPath(centralLine);
		}
		else
		{
			console.log("No central line.");
		}
		
		if(southernUmbraLine)
		{
			console.log("Found: " + southernUmbraLine.length + " southern umbral line positions.");
			
			eclipseMap.drawSouthUmbraLimit(southernUmbraLine);
		}
		else
		{
			console.log("No southern umbral line.");
		}
		
		if(northernUmbraLine)
		{
			console.log("Found: " + northernUmbraLine.length + " northern umbral line positions.");
			
			eclipseMap.drawNorthUmbraLimit(northernUmbraLine);
		}
		else
		{
			console.log("No northern umbral line.");
		}
		
		if(southernPenumbraLine)
		{
			console.log("Found: " + southernPenumbraLine.length + " southern penumbra line positions.");
		
			eclipseMap.drawSouthPenumbraLimit(southernPenumbraLine);
		}
		else
		{
			console.log("No southern penumbra line.");
		}
		
		if(northernPenumbraLine)
		{
			console.log("Found: " + northernPenumbraLine.length + " northern penumbra line positions.");
		
			eclipseMap.drawNorthPenumbraLimit(northernPenumbraLine);
		}
		else
		{
			console.log("No northern penumbra line.");
		}
		
		if(eastEclipseLine)
		{
			console.log("Found: " + eastEclipseLine.length + " east eclipse line points.");	
			eclipseMap.drawEastLimitLine(eastEclipseLine);
		}
		else
		{
			console.log("No east eclipse line found.");
		}
		
		if(westEclipseLine)
		{
			console.log("Found: " + westEclipseLine.length + " west eclipse line points.");	
			eclipseMap.drawWestLimitLine(westEclipseLine);
		}
		else
		{
			console.log("No west eclipse line found.");
		}
                
                // drawMidEclipseShadows();
	}
}

// Basically just for testing the shadow drawing functions
// Not necessarily called in normal ops.
function drawMidEclipseShadows()
{
    var eclipse = eclipseInfo.getEclipse(selected_eclipse);
    if (eclipse.getPenumbraStartTime())
    {
        eclipseMap.setCenter(eclipse.midEclipsePoint.latitude, eclipse.midEclipsePoint.longitude);
        eclipseMap.setZoom(3);

        // var penumbraAnimateDate = new Date(eclipse.maxEclipseDate);
        var penumbraAnimateDate = new Date("20 May 2012 23:44:03 GMT");
        // penumbraAnimateDate.setUTCHours(penumbraAnimateDate.getUTCHours() - 1);
        var penumbraShadow = eclipse.drawPenumbraShadow(penumbraAnimateDate);

        eclipseMap.drawPenumbraShadow(penumbraShadow);
    }

    if (eclipse.getUmbraStartTime())
    {
        // var umbraAnimateDate = new Date(eclipse.maxEclipseDate);
        var umbraAnimateDate = new Date("20 May 2012 23:44:03 GMT");
        // umbraAnimateDate.setUTCHours(umbraAnimateDate.getUTCHours() - 1);
        var umbraShadow = eclipse.drawUmbraShadow(umbraAnimateDate);

        eclipseMap.drawUmbraShadow(umbraShadow);
    }
               
}

function animateShadow()
{
    bAnimating = true;

    var eclipse = JSON.stringify(eclipseInfo.getEclipse(selected_eclipse));

    if (drawWorker == null)
    {
        drawWorker = new Worker("animateWorker.js");
        drawWorker.onmessage = onDrawWorker;
    }

    drawWorker.postMessage({'cmd': 'shadow', 'eclipse': eclipse});

    header.html("Drawing shadow...");

    var lat = eclipseInfo.getEclipse(selected_eclipse).midEclipsePoint.latitude;
    var long = eclipseInfo.getEclipse(selected_eclipse).midEclipsePoint.longitude;

    if (lat > 45.0)
    {
        lat = 45.0;
    }
    if (lat < -45.0)
    {
        lat = -45.0;
    }

    eclipseMap.setCenter(lat, long);
    eclipseMap.setZoom(3);
}

function startRealTimeShadow()
{
    var currentTime = new Date();
    currentTime.setTime(currentTime.getTime() + dateOffset);
    var eclipse = eclipseInfo.getEclipse(selected_eclipse);
    
    if (currentTime >= eclipse.getPenumbraStartTime() && currentTime <= eclipse.getPenumbraEndTime())
    {
        bRealTimeShadow = true;

        if (drawWorker == null)
        {
            drawWorker = new Worker("animateWorker.js");
            drawWorker.onmessage = onDrawWorker;
        }
        
        eclipse = JSON.stringify(eclipse);

        drawWorker.postMessage({'cmd': 'real', 'eclipse': eclipse, 'dateOffset': dateOffset});

        header.html("Drawing shadow...");
        toastPop("Drawing real time shadow...");
    }
    else
    {
        toastPop("Eclipse not occurring at this time.");
    }
}

function stopRealTimeShadow()
{
    bRealTimeShadow = false;
    
    eclipseMap.clearShadows();
    
    if(drawWorker != null)
    {
        drawWorker.terminate();
        drawWorker = null;
    }
  
    header.html("Eclipse Map");
    toastPop("Stopping realtime shadow.");
}

function onDrawWorker(msg)
{
    var data = msg.data;
    
    switch (data.cmd) 
    {
        case 'shadow_done':
            onShadowComplete(data);
            break;
        default:
            break;
    }  
}

function onShadowComplete(data)
{
    var penumbraShadow = JSON.parse(data.pen_shadow);
    var umbraShadow = JSON.parse(data.umb_shadow);
    var animateDate = new Date(data.date);
    
    eclipseMap.clearShadows();
    
    if(penumbraShadow != null)
    {
        eclipseMap.drawPenumbraShadow(penumbraShadow);
    }
    
    if(umbraShadow != null)
    {
        eclipseMap.drawUmbraShadow(umbraShadow);
    }
    
    header.html(animateDate.toLocaleTimeString());
}

function stopShadowAnimation()
{
    bAnimating = false;
    bRealTimeSahdow = false;
    
    eclipseMap.clearShadows();
    
    if(drawWorker != null)
    {
        drawWorker.terminate();
        drawWorker = null;
    }
    
    header.html("Eclipse Map");
}

function onEclipseLoadComplete()
{
    $.mobile.loading("hide");
    getPosition();
    coordInterval = setInterval(backGroundUpdate, UPDATE_INTERVAL );
	
    console.log("Eclipse load complete: " + eclipseInfo.getEclipseCount() + " eclipses loaded.");
	
    buildEclipseList();
}

function updateCalculations()
{
    if (selected_eclipse >= 0)
    {
        var eclipseStats = eclipseInfo.getEclipse(selected_eclipse).calculateLocalCircumstances(latitude, longitude, altitude);
        var current_date = new Date();
        current_date.setTime(current_date.getTime() + dateOffset);

        if (eclipseStats.isVisible)		// TODO: Fix? CPU time costly to traverse the DOM everytime we update this.
        {
            var date_options = {year: "numeric", month: "long", day: "numeric"};
            var c1CountDown = new TimeSpan(eclipseStats.circDates.getC1Date(), current_date);
            var midCountDown = new TimeSpan(eclipseStats.circDates.getMidDate(), current_date);
            var c4CountDown = new TimeSpan(eclipseStats.circDates.getC4Date(), current_date);
            var localTimeZoneOffset = current_date.getTimezoneOffset();
            var zone_options = {};

            if (gEclipseTimeZone != null)
            {
                if (localTimeZoneOffset != gEclipseTimeZone)
                {
                    date_options.timeZone = gEclipseTimeZoneID;
                    zone_options = {timeZone: gEclipseTimeZoneID};
                }
            }
            
            var sunrise = calcSunriseSetUTC(true, eclipseStats.circDates.getMidDate(), latitude, longitude);
            var sunset = calcSunriseSetUTC(false, eclipseStats.circDates.getMidDate(), latitude, longitude);
            var midSolarElevation = getSolarElevation(latitude, longitude, eclipseStats.circDates.getMidDate());
            var sunrise_time_string = "";
            var sunset_time_string = "";
            var rise_count_str = "";
            var set_count_str = "";
            
            if(!sunrise)
            {
                rise_count_str = "--:--:--";
                if(midSolarElevation >= 0.0)
                {
                    sunrise_time_string = "Sun is Up";
                }
                else
                {
                    sunrise_time_string = "Sun is Down";    // This situation should not be possible.
                }
            }
            else
            {
                rise_count_str = new TimeSpan(sunrise, current_date).toTimeString();
                try
                {
                    sunrise_time_string = sunrise.toLocaleTimeString(TIME_LOCALE, zone_options);
                }
                catch(error)    // For Internet Explorer
                {
                    sunrise_time_string = sunrise.toLocaleTimeString(TIME_LOCALE);
                }
            }
            if(!sunset)
            {
                set_count_str = "--:--:--";
                if(midSolarElevation >= 0.0)
                {
                    sunset_time_string = "Sun is Up";
                }
                else
                {
                    sunset_time_string = "Sun is Down";    // This situation should not be possible.
                }
            }
            else
            {
                set_count_str = new TimeSpan(sunset, current_date).toTimeString();
                try
                {
                    sunset_time_string = sunset.toLocaleTimeString(TIME_LOCALE, zone_options);
                }
                catch(error)    // For Internet Explorer
                {
                    sunset_time_string = sunset.toLocaleTimeString(TIME_LOCALE);
                }
            }
            $("#sunrise_time").html(sunrise_time_string);
            $("#sunrise_count").html(rise_count_str);
            $("#sunset_time").html(sunset_time_string);
            $("#sunset_count").html(set_count_str);
        
            try // FOR INTERNET EXPLORER TODO: FIX THIS!!!
            {
                $("#eclipse_list_stats li").show(0);
                $("#not_visible").hide(0);
                $("#eclipse_pic").attr("src", IMGS_FOLDER + eclipseStats.eclipseType.toLowerCase() + ".png");
                $("#eclipse_type").html(eclipseStats.eclipseType + " Eclipse Occurs");
                $("#eclipse_date").html(eclipseStats.circDates.getMidDate().toLocaleDateString(TIME_LOCALE, date_options));
                $("#coverage").html("Cov: " + eclipseStats.coverage.toFixed(1) + "%");
                $("#magnitude").html("Mag: " + eclipseStats.magnitude.toFixed(1) + "%");

                $("#c1_time").html(eclipseStats.circDates.getC1Date().toLocaleTimeString(TIME_LOCALE, zone_options));
                $("#c1_count").html(c1CountDown.toTimeString());
                $("#mid_time").html(eclipseStats.circDates.getMidDate().toLocaleTimeString(TIME_LOCALE, zone_options));
                $("#mid_count").html(midCountDown.toTimeString());
                $("#c4_time").html(eclipseStats.circDates.getC4Date().toLocaleTimeString(TIME_LOCALE, zone_options));
                $("#c4_count").html(c4CountDown.toTimeString());
                $("#entire_duration").html(eclipseStats.c1c4TimeSpan.toTimeString());

                if (eclipseStats.firstContactBelowHorizon)
                {
                    $("#c1_horiz").show(0);
                }
                else
                {
                    $("#c1_horiz").hide(0);
                }

                if (eclipseStats.midEclipseBelowHorizon)
                {
                    $("#mid_horiz").show(0);
                }
                else
                {
                    $("#mid_horiz").hide(0);
                }

                if (eclipseStats.fourthContactBelowHorizon)
                {
                    $("#c4_horiz").show(0);
                }
                else
                {
                    $("#c4_horiz").hide(0);
                }

                if (eclipseStats.eclipseType == "Annular" || eclipseStats.eclipseType == "Total")
                {
                    var c2CountDown = new TimeSpan(eclipseStats.circDates.getC2Date(), current_date);
                    var c3CountDown = new TimeSpan(eclipseStats.circDates.getC3Date(), current_date);

                    var depth_string = "Depth: " + eclipseStats.depth.toFixed(1) + "%";
                    if (eclipseStats.northOfCenter)
                    {
                        depth_string += " N";
                    }
                    else
                    {
                        depth_string += " S";
                    }

                    $("[eclipse-data='total']").show(0);
                    $("#depth").show(0);
                    $("#depth").html(depth_string);
                    $("#type_div_start").html(eclipseStats.eclipseType + " Phase Begins");
                    $("#type_div_end").html(eclipseStats.eclipseType + " Phase Ends");

                    $("#c2_time").html(eclipseStats.circDates.getC2Date().toLocaleTimeString(TIME_LOCALE, zone_options));
                    $("#c2_count").html(c2CountDown.toTimeString());
                    $("#c3_time").html(eclipseStats.circDates.getC3Date().toLocaleTimeString(TIME_LOCALE, zone_options));
                    $("#c3_count").html(c3CountDown.toTimeString());

                    $("#total_duration").html(eclipseStats.c2c3TimeSpan.toTimeString());

                    if (eclipseStats.secondContactBelowHorizon)
                    {
                        $("#c2_horiz").show(0);
                    }
                    else
                    {
                        $("#c2_horiz").hide(0);
                    }

                    if (eclipseStats.thirdContactBelowHorizon)
                    {
                        $("#c3_horiz").show(0);
                    }
                    else
                    {
                        $("#c3_horiz").hide(0);
                    }
                }
                else
                {
                    $("#depth").hide(0);
                    $("[eclipse-data='total']").hide(0);
                }
            }
            catch (error)
            {
                delete date_options.timeZone;
                delete zone_options.timeZone;

                $("#eclipse_list_stats li").show(0);
                $("#not_visible").hide(0);
                $("#eclipse_pic").attr("src", IMGS_FOLDER + eclipseStats.eclipseType.toLowerCase() + ".png");
                $("#eclipse_type").html(eclipseStats.eclipseType + " Eclipse Occurs");
                $("#eclipse_date").html(eclipseStats.circDates.getMidDate().toLocaleDateString(TIME_LOCALE, date_options));
                $("#coverage").html("Cov: " + eclipseStats.coverage.toFixed(1) + "%");
                $("#magnitude").html("Mag: " + eclipseStats.magnitude.toFixed(1) + "%");

                $("#c1_time").html(eclipseStats.circDates.getC1Date().toLocaleTimeString(TIME_LOCALE, zone_options));
                $("#c1_count").html(c1CountDown.toTimeString());
                $("#mid_time").html(eclipseStats.circDates.getMidDate().toLocaleTimeString(TIME_LOCALE, zone_options));
                $("#mid_count").html(midCountDown.toTimeString());
                $("#c4_time").html(eclipseStats.circDates.getC4Date().toLocaleTimeString(TIME_LOCALE, zone_options));
                $("#c4_count").html(c4CountDown.toTimeString());
                $("#entire_duration").html(eclipseStats.c1c4TimeSpan.toTimeString());

                if (eclipseStats.firstContactBelowHorizon)
                {
                    $("#c1_horiz").show(0);
                }
                else
                {
                    $("#c1_horiz").hide(0);
                }

                if (eclipseStats.midEclipseBelowHorizon)
                {
                    $("#mid_horiz").show(0);
                }
                else
                {
                    $("#mid_horiz").hide(0);
                }

                if (eclipseStats.fourthContactBelowHorizon)
                {
                    $("#c4_horiz").show(0);
                }
                else
                {
                    $("#c4_horiz").hide(0);
                }

                if (eclipseStats.eclipseType == "Annular" || eclipseStats.eclipseType == "Total")
                {
                    var c2CountDown = new TimeSpan(eclipseStats.circDates.getC2Date(), current_date);
                    var c3CountDown = new TimeSpan(eclipseStats.circDates.getC3Date(), current_date);

                    var depth_string = "Depth: " + eclipseStats.depth.toFixed(1) + "%";
                    if (eclipseStats.northOfCenter)
                    {
                        depth_string += " N";
                    }
                    else
                    {
                        depth_string += " S";
                    }

                    $("[eclipse-data='total']").show(0);
                    $("#depth").show(0);
                    $("#depth").html(depth_string);
                    $("#type_div_start").html(eclipseStats.eclipseType + " Phase Begins");
                    $("#type_div_end").html(eclipseStats.eclipseType + " Phase Ends");

                    $("#c2_time").html(eclipseStats.circDates.getC2Date().toLocaleTimeString(TIME_LOCALE, zone_options));
                    $("#c2_count").html(c2CountDown.toTimeString());
                    $("#c3_time").html(eclipseStats.circDates.getC3Date().toLocaleTimeString(TIME_LOCALE, zone_options));
                    $("#c3_count").html(c3CountDown.toTimeString());

                    $("#total_duration").html(eclipseStats.c2c3TimeSpan.toTimeString());

                    if (eclipseStats.secondContactBelowHorizon)
                    {
                        $("#c2_horiz").show(0);
                    }
                    else
                    {
                        $("#c2_horiz").hide(0);
                    }

                    if (eclipseStats.thirdContactBelowHorizon)
                    {
                        $("#c3_horiz").show(0);
                    }
                    else
                    {
                        $("#c3_horiz").hide(0);
                    }
                }
                else
                {
                    $("#depth").hide(0);
                    $("[eclipse-data='total']").hide(0);
                }
            }
        }
        else
        {
            resetEclipseListStats();
        }

        $("#eclipse_list_stats").listview("refresh");
    }
}

// Resets the Eclipse Countdown Stats View
function resetEclipseListStats()
{
	$("#eclipse_list_stats li").hide(0);
	$("#eclipse_stats_header").show(0);
	$("#eclipse_type").html("No Eclipse Occurs");
	$("#not_visible").show(0);
	$("#coverage").html("Coverage: 0.0%");
	$("#magnitude").html("Magnitude: 0.0%");
	$("#depth").hide(0);
	$("#eclipse_date").html("");
	$("#eclipse_pic").attr("src", "images/no-eclipse.png");
}

function buildEclipseList()
{
    console.log("Building eclipse list.");

    var list_html = "";
    var date_options = {timeZone: "UTC", year: "numeric", month: "long", day: "numeric"};
    var next_eclipse = eclipseInfo.getNextEclipseIdx();

    for (var i = 0; i < eclipseInfo.getEclipseCount(); i++)
    {
        list_html += "<li eclipse-index='" + i + "'><img src='images/" + eclipseInfo.getEclipse(i).type.toLowerCase() + ".png'>" +
                "<H2>" + eclipseInfo.getEclipse(i).type + "</H2>" +
                "<p>" + eclipseInfo.getEclipse(i).maxEclipseDate.toLocaleDateString(TIME_LOCALE, date_options) + "</p>" +
                "</li>";
    }

    var eclipse_list = $("#eclipse_list");
    eclipse_list.html(list_html);

    if (selected_eclipse < 0)
    {
        selected_eclipse = next_eclipse;
    }

    var eclipse_list_list_items = eclipse_list.children("li");
    var next_eclipse_item = eclipse_list_list_items.eq(next_eclipse);
    var selected_eclipse_item = eclipse_list_list_items.eq(selected_eclipse);

    // next_eclipse_item.children("a").append("<span class='ui-li-count'>Next Eclipse</span>");
    next_eclipse_item.append("<span class='ui-li-count'>Next Eclipse</span>");
    
    eclipse_list.listview("refresh");
    // selected_eclipse_item.children("a").addClass('ui-btn-b');	// Changes background color of "selected" eclipse.
    selected_eclipse_item.removeClass('ui-body-inherit');
    selected_eclipse_item.addClass('ui-body-b');
    selected_eclipse_item.children("p").css("color", "white");
    

    eclipse_list_list_items.click(function(event)
    {
        onEclipseClicked(event, this);
    });

    drawEclipseMap();
}

function onEclipseLoadError(status)
{
    $.mobile.loading("hide");
    
    console.log("Eclipse loader error: " + status);
}

function onAltClick(event)
{
    getElevation();
    toastPop("Updating your altitude.");
}

// Map animation button is clicked.
function onAnimateClick(event)
{
    if(eclipseMap)
    {
        if(bRealTimeShadow)
        {
            stopRealTimeShadow();
        }
        
	if(bAnimating)
	{
            toastPop("Stopping shadow animation.");
            stopShadowAnimation();
	}
	else
	{
            toastPop("Starting shadow animation.");
            bCenterEclipseMap = false;
            animateShadow();
	}
    }
    
    updateHighlights();
    $("#map-panel").panel("close");	
}

function onRealTimeShadow(event)
{
    if(eclipseMap)
    {
        if(bAnimating)
        {
            stopShadowAnimation();
        }
        
        if(bRealTimeShadow)
        {
            stopRealTimeShadow();
        }
        else
        {
            startRealTimeShadow();
        }
    }
    
    updateHighlights();
    
    $("#map-panel").panel("close");	
}

function onSunriseClick(event)
{
    if(selected_eclipse >= 0)
    {
        var eclipse = eclipseInfo.getEclipse(selected_eclipse);
        var eclipseStats = eclipse.calculateLocalCircumstances(latitude, longitude, altitude);
        var currentDate = new Date();
        var sunrise = calcSunriseSetUTC(true, eclipseStats.circDates.getMidDate(), latitude, longitude );
        
        if(sunrise)
        {
            if(sunrise >= eclipse.getPenumbraStartTime() && sunrise <= eclipse.getPenumbraEndTime())
            {
                dateOffset = sunrise.getTime() - currentDate.getTime() - TIME_TRAVEL_OFFSET;
                if(isNaN(dateOffset))
                {
                    dateOffset = 0;
                }
                else
                {
                    setPopMsg("Time travel to sun rise time. Drawing realtime shadow.");
                }
        
                stopRealTimeShadow();
                startRealTimeShadow();
            }
            else
            {
                setPopMsg("Eclipse does not occur during local sunrise time.");
            }
        }
        else
        {
            setPopMsg("There is no sunrise time.");
        }
    }
}

function onSunsetClick(event)
{
    if(selected_eclipse >= 0)
    {
        var eclipse = eclipseInfo.getEclipse(selected_eclipse);
        var eclipseStats = eclipse.calculateLocalCircumstances(latitude, longitude, altitude);
        var currentDate = new Date();
        var sunset = calcSunriseSetUTC(false, eclipseStats.circDates.getMidDate(), latitude, longitude );
        
        if(sunset)
        {
            if(sunset >= eclipse.getPenumbraStartTime() && sunset <= eclipse.getPenumbraEndTime())
            {
                dateOffset = sunset.getTime() - currentDate.getTime() - TIME_TRAVEL_OFFSET;
                if(isNaN(dateOffset))
                {
                    dateOffset = 0;
                }
                else
                {
                    setPopMsg("Time travel to sunset time. Drawing realtime shadow.");
                }
        
                stopRealTimeShadow();
                startRealTimeShadow();
            }
            else
            {
                setPopMsg("Eclipse does not occur during local sunset time.");
            }
        }
        else
        {
            setPopMsg("There is no sunset time.");
        }
    }
}


function onC1Click(event)
{
    if(selected_eclipse >= 0)
    {
        var eclipseStats = eclipseInfo.getEclipse(selected_eclipse).calculateLocalCircumstances(latitude, longitude, altitude);
        var currentDate = new Date();
        dateOffset = eclipseStats.circDates.getC1Date().getTime() - currentDate.getTime() - TIME_TRAVEL_OFFSET;
        if(isNaN(dateOffset))
        {
            dateOffset = 0;
        }
        else
        {
            setPopMsg("Time travel to first contact. Drawing realtime shadow.");
        }
        
        stopRealTimeShadow();
        startRealTimeShadow();
    }
}

function onC2Click(event)
{
    if (selected_eclipse >= 0)
    {
        var eclipseStats = eclipseInfo.getEclipse(selected_eclipse).calculateLocalCircumstances(latitude, longitude, altitude);
        var currentDate = new Date();
        dateOffset = eclipseStats.circDates.getC2Date().getTime() - currentDate.getTime() - TIME_TRAVEL_OFFSET;
        if (isNaN(dateOffset))
        {
            dateOffset = 0;
        }
        else
        {
            setPopMsg("Time travel to second contact. Drawing realtime shadow.");
        }
       
        stopRealTimeShadow();
        startRealTimeShadow();
    }
}

function onMidClick(event)
{
    if(selected_eclipse >= 0)
    {
        var eclipseStats = eclipseInfo.getEclipse(selected_eclipse).calculateLocalCircumstances(latitude, longitude, altitude);
        var currentDate = new Date();
        dateOffset = eclipseStats.circDates.getMidDate().getTime() - currentDate.getTime() - TIME_TRAVEL_OFFSET;
        if(isNaN(dateOffset))
        {
            dateOffset = 0;
        }
        else
        {
            setPopMsg("Time travel to mid eclipse. Drawing realtime shadow.");
        }
       
        stopRealTimeShadow();
        startRealTimeShadow();
    }
}

function onC3Click(event)
{
    if(selected_eclipse >= 0)
    {
        var eclipseStats = eclipseInfo.getEclipse(selected_eclipse).calculateLocalCircumstances(latitude, longitude, altitude);
        var currentDate = new Date();
        dateOffset = eclipseStats.circDates.getC3Date().getTime() - currentDate.getTime() - TIME_TRAVEL_OFFSET;
        if(isNaN(dateOffset))
        {
            dateOffset = 0;
        }
        else
        {
            setPopMsg("Time travel to third contact. Drawing realtime shadow.");
        }
       
        stopRealTimeShadow();
        startRealTimeShadow();
    }
}

function onC4Click(event)
{
    if(selected_eclipse >= 0)
    {
        var eclipseStats = eclipseInfo.getEclipse(selected_eclipse).calculateLocalCircumstances(latitude, longitude, altitude);
        var currentDate = new Date();
        dateOffset = eclipseStats.circDates.getC4Date().getTime() - currentDate.getTime() - TIME_TRAVEL_OFFSET;
        if(isNaN(dateOffset))
        {
            dateOffset = 0;
        }
         else
        {
            setPopMsg("Time travel to fourth contact. Drawing realtime shadow.");
        }
        
        stopRealTimeShadow();
        startRealTimeShadow();
    }
}

// Center location list item clicked.
function onCenterClick(event)
{
	if(bCenterEclipseMap)
	{
		bCenterEclipseMap = false;
	}
	else
	{
		bCenterEclipseMap = true;	
	}
	
	updateHighlights();

	$("#map-panel").panel("close");
}

// Countdowns page is shown.
function onCountDownsPageShow(event)
{
    bCountDownsShown = true;
}


/*
 * Nav panel was closed.
 */
function onNavPanelClose(event)
{
    var current_page = $(":mobile-pagecontainer").pagecontainer("getActivePage").attr("id");

    if (current_page === "eclipse")
    {
        scrollEclipseList();
    }
}

/*
 * Before the main nav panel opens.
 */
function onNavPanelBeforeOpen(event)
{
    // TODO: Check, not sure why we have to do this now, didn't have to do this befor?
    updateHighlights();
}

// After the main nav panel opens
function onNavPanelOpen(event)
{
    // updateHighlights();
}

// Manual location list item clicked.
function onManualLocClick(event)
{
    switchManualMode();
}

/*
 * Flips between manual and GPS upating locaiton modes.
 * input bForceMode = true, force to manual location, false: force to GPS location.
 */
function switchManualMode(bForceMode)
{
    if(typeof(bForceMode) == "boolean")
    {
        bManualLocation = !bForceMode;
    }
    
    if (bManualLocation)
    {
        bManualLocation = false;

        if (watchPosition == null)	// Have to do this with Firefox.  valid watch id is zero.
        {
            getPosition();
        }

        eclipseMap.setManualMode(false);
        $("#autoCity").hide();
        toastPop("Switching to GPS location mode.");
    }
    else
    {
        bManualLocation = true;
        stopPosition();
        eclipseMap.setManualMode(true);
        $("#autoCity").show();
        toastPop("Switching to manual location mode.");
    }

    updateHighlights();
}

/*
 * Scrolls the Eclipse Selector to the currently selected eclipse.
 */
function scrollEclipseList()
{	
	if(selected_eclipse >= 0)
	{
		var scroll_pos = $("#eclipse_list li").eq(selected_eclipse).position().top;	
		$.mobile.silentScroll(scroll_pos);
	}
}

function onOrientationChange()
{
    rightSizeObjects();
    if(eclipseMap)
    {
        eclipseMap.resizeMap();
    }
}

function onPosition(position)
{
    if (!bManualLocation)
    {
        var bPositionChanged = false;
        var bPositionSigChange = false;
        var bAltInvalid = false;
        
        if(Math.abs(latitude - position.coords.latitude) > 0.015)
        {
            bPositionChanged = true;
        }
        if(Math.abs(longitude - position.coords.longitude) > 0.015)
        {
            bPositionChanged = true;
        }
        
        if(Math.abs(latitude - position.coords.latitude) > 0.5)
        {
            bPositionSigChange = true;
        }
        if(Math.abs(longitude - position.coords.longitude) > 0.5)
        {
            bPositionSigChange = true;
        }

        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        
        if(position.coords.altitude != null)
        {
            if(position.coords.altitude == 0)   // This is for Firefox.  On IP geolocation, browser is returning 0 for altitude, when it should return null.
            {
                if(position.coords.accuracy > 10000)
                {
                    bAltInvalid = true
                }
            }
        }
        else
        {
            bAltInvalid = true;
        }
        
        if(!bAltInvalid)
        {
            altitude = position.coords.altitude;
        }
        
        if (bAltInvalid && bPositionChanged)
        {
            getElevation();
        }
        
        if(bPositionSigChange)
        {
            getGoogleTimeZone(latitude, longitude, onGoogleTimeZone);
        }
    }
}
 	
function onPosError(data)
{
    console.log("Updated position error: " + data.message);
    
    if(!bGoodFirstPostion)
    {
        if(!bManualLocation)    // Some reason this is getting called twice?
        {
            $("#popupGPSError").popup("open");
        }
    }
}
   	
function onPositionOne(position)
{
    bGoodFirstPostion = true;
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    altitude = position.coords.altitude;
   
    if (!altitude)
    {
        altitude = 0.0;
        getElevation();
    }

    getGoogleTimeZone(latitude, longitude, onGoogleTimeZone);
    
    startWatchPosition();
}

function startWatchPosition()
{
    if (!bManualLocation)
    {
        try
        {
            watchPosition = navigator.geolocation.watchPosition(onPosition, onPosError, {enableHighAccuracy: true, maximumAge: 0, timeout: 20000});
        }
        catch (e)
        {
            console.log("Geolocation not available: " + e.toString());
            $("#popupGPSError").popup("open");
        }
    } 
}
   	
function onPosErrorOne(data)
{
    bGoodFirstPostion = false;
    console.log("Error reading first position: " + data.message);
    
    // OK, failed getting current position, possibly from no internet connection.  GPS might still be available.
    startWatchPosition();
}

function afterGPSError(event, ui)
{
    switchManualMode(true);
}

function createMap()
{
    if (!eclipseMap.isReady())
    {
        eclipseMap.setCanvas(document.getElementById("eclipse-map-canvas"));
        eclipseMap.setOnMapClick(function(lat, long)
        {
            onMapClick(lat, long);
        });
        eclipseMap.setAutoComplete(document.getElementById('autoCity'));
    }
}

function onEclipseMapPageCreate(event)
{
    console.log("Eclipse map page create called.");
    createMap();
}

function rightSizeObjects()
{
    var current_page = $( ":mobile-pagecontainer" ).pagecontainer( "getActivePage" ).attr("id");
    var min_height = getRealContentHeight();
     
    if(current_page === "eclipse-map")
    {
        $("#eclipse-map-canvas").height(min_height - 32);
    }
    if(current_page === "countdowns")
    {
        $("#eclipse_list_stats").css('min-height', min_height + "px");
    }
    if(current_page === "about")
    {
        $("#about_content").css('min-height', min_height + "px");
    }
    if(current_page === "simulation")
    {
        $("#simulation-content").css('min-height', min_height + "px");
        setSunDivPosition();
        updateMoonPos();
    }  
}

function onTimeClick(event)
{
    if(dateOffset == 0)
    {
        $("#timetravel").datebox("open");
    }
    else
    {
        toastPop("Going back to current time.");
        dateOffset = 0;
        if(bRealTimeShadow)
        {
            stopRealTimeShadow();
            startRealTimeShadow();
        }
    }
}

function dateBoxClose(event)
{
    var current_date = new Date();
    var new_date = new Date(event);
    
    new_date.setHours(current_date.getHours());
    new_date.setMinutes(current_date.getMinutes());
    
    $("#timetravel_time").datebox("setTheDate", new_date);
    $("#timetravel_time").datebox("open");
}

function parseNewDate(event)
{
    var new_time = new Date($("#timetravel_time").datebox("getTheDate"));
    var new_date = new Date($("#timetravel").datebox("getTheDate"));

    new_date.setHours(new_time.getHours());
    new_date.setMinutes(new_time.getMinutes());

    if (!isNaN(new_date.getTime()))
    {
        var current_date = new Date();
        dateOffset = new_date.getTime() - current_date.getTime();
        toastPop("Time travel set!");
    }
    else
    {
        dateOffset = 0;
        toasPop("Time travel disabled.");
    }

    if (bRealTimeShadow)
    {
        stopRealTimeShadow();
        startRealTimeShadow();
    }

    console.log("New time: " + new_date.toLocaleString());
}

function onWindowResize(event)
{
    rightSizeObjects();
}

function onMobileInit()
{
    console.log("Mobile init called.");
    $.mobile.defaultPageTransition = "slide";
    $.mobile.focusClass = "";   // TODO: Remove in JQM 1.5, it won't work anymore.
    $.mobile.activeBtnClass = "";   // TODO: Remove in JQM 1.5, deprecated.
    
}

function initBinders()
{

    // Overides mouse over in list items??
    /****
     $('a').on("mouseenter mouseleave", function()
    {
        console.log("Mouse over!");
        event.preventDefault();
        return false;
    });
    ***/
   
    $("a").click(onHrefClick);  // Check if its an internal or external link for Cordova app.
    
    $( document ).on("pagecontainershow", function(event, ui)
    {
        onPageShow(event);
    });

    $(document).on("pagecontainerbeforetransition", function(event, ui)
    {
        onPageTransistion(event);
    });

    $(document).on("pagecreate", "#eclipse-map", function(event)
    {
        onEclipseMapPageCreate(event);
    });

    $(window).on("orientationchange", function(event)
    {
        onOrientationChange(event);
    });

    $(window).resize(onWindowResize);

    $("#nav-panel").on("panelclose", function(event, ui)
    {
        onNavPanelClose(event);
    });

    $("#nav-panel").on("panelopen", onNavPanelOpen);
    $("#nav-panel").on("panelbeforeopen", onNavPanelBeforeOpen);

    $("#centerloc").click(function(event)
    {
        onCenterClick(event);
    });

    $("#manualloc").click(function(event)
    {
        onManualLocClick(event);
    });

    $("#animate").click(function(event)
    {
        onAnimateClick(event);
    });

    $("#realtime").click(onRealTimeShadow);

    $("#c1_click").click(onC1Click);
    $("#c2_click").click(onC2Click);
    $("#mid_click").click(onMidClick);
    $("#c3_click").click(onC3Click);
    $("#c4_click").click(onC4Click);
    
    $("#sunrise_click").click(onSunriseClick);
    $("#sunset_click").click(onSunsetClick);
    
    $("#c1_sim").click(onC1SimClick);
    $("#mid_sim").click(onMidSimClick);
    $("#c4_sim").click(onC4SimClick);
    $("#simanimate").click(onSimAnimateClick);
    $("#simrealtime").click(onSimRealTimeClick);

    timeID.click(onTimeClick);
    altID.click(onAltClick);
    
    $("#popupGPSError").popup({afterclose: afterGPSError});
}

function onC1SimClick(event)
{
    $("#popSim").popup("close");
    stopAnimateMoon();
    
    if(selected_eclipse >= 0 )
    {
        var eclipseStats = eclipseInfo.getEclipse(selected_eclipse).calculateLocalCircumstances(latitude, longitude, altitude);
        
        if(eclipseStats.isVisible)
        {
            var eclipseTime = new Date(eclipseStats.circDates.getC1Date());
            var positions = new PlanetPositionsAC();
           
            // eclipseTime.setUTCSeconds(eclipseTime.getUTCSeconds() - 10);
            positions.setDate(eclipseTime);
            moonPos = positions.getMoonPosition(latitude, longitude, altitude);
            sunPos = positions.getSunPosition(latitude, longitude, altitude);
            header.html("First Contact");
        }
        else
        {
           header.html("No Eclipse");
           delayToast("Eclipse not visible.");
           moonPos = null;
           sunPos = null;
        }
    }
    else
    {
        moonPos = null;
        sunPos = null;
        header.html("No Eclipse");
        delayToast("Eclipse not selected.");
    }
    
    updateMoonPos();
}

function onC4SimClick(event)
{
    $("#popSim").popup("close");
    stopAnimateMoon();
    
    if(selected_eclipse >= 0 )
    {
        var eclipseStats = eclipseInfo.getEclipse(selected_eclipse).calculateLocalCircumstances(latitude, longitude, altitude);
        
        if(eclipseStats.isVisible)
        {
            var eclipseTime = new Date(eclipseStats.circDates.getC4Date());
            var positions = new PlanetPositionsAC();
            
            // eclipseTime.setUTCSeconds(eclipseTime.getUTCSeconds() - 10);
            positions.setDate(eclipseTime);
            moonPos = positions.getMoonPosition(latitude, longitude, altitude);
            sunPos = positions.getSunPosition(latitude, longitude, altitude);
      
            header.html("Fourth Contact");
        }
        else
        {
           header.html("No Eclipse");
           delayToast("Eclipse not visible.");
           moonPos = null;
           sunPos = null;
        }
    }
    else
    {
        moonPos = null;
        sunPos = null;
        header.html("No Eclipse");
        delayToast("Eclipse not selected.");
    }
    
    updateMoonPos();
}

function onMidSimClick(event)
{
    $("#popSim").popup("close");
    stopAnimateMoon();
    
    if(selected_eclipse >= 0 )
    {
        var eclipseStats = eclipseInfo.getEclipse(selected_eclipse).calculateLocalCircumstances(latitude, longitude, altitude);
        
        if(eclipseStats.isVisible)
        {
            var eclipseTime = new Date(eclipseStats.circDates.getMidDate());
            var positions = new PlanetPositionsAC();
            
            /***
            var pAngle = eclipseStats.pAngle;
            var magnitude = eclipseStats.magnitude;
            positions.setBesselCorrection(pAngle, magnitude, eclipseTime, latitude, longitude, altitude);
            ***/
            // positions.setMoonCorrection(eclipseTime, -3.373028794532953E+05, -1.985403687261781E+05,  7.148097122777436E+03);
            
            var start = new Date();
            positions.setDate(eclipseTime);
            moonPos = positions.getMoonPosition(latitude, longitude, altitude);
            sunPos = positions.getSunPosition(latitude, longitude, altitude);
            var finish = new Date();
            var dTime = finish.getTime() - start.getTime();
            
            console.log("It took: " + dTime + " milliseconds to calculate the position of the Sun and Moon.");
            header.html("Mid Eclipse");
       }
       else
       {
           header.html("No Eclipse");
           delayToast("Eclipse not visible.");
           moonPos = null;
           sunPos = null;
       }
    }
    else
    {
        moonPos = null;
        sunPos = null;
        header.html("No Eclipse");
        delayToast("Eclipse is not selected.");
    }
    
    updateMoonPos();
}

function onSimAnimateClick(event)
{
    $("#popSim").popup("close");
    
    if(moonInterval != null)
    {
        stopAnimateMoon();
        onMidSimClick(event);
    }
    else
    {
        if(selected_eclipse >= 0 )
        {
            var eclipseStats = eclipseInfo.getEclipse(selected_eclipse).calculateLocalCircumstances(latitude, longitude, altitude);
        
            if(eclipseStats.isVisible)
            {
                moonAnimateStartTime = new Date(eclipseStats.circDates.getC1Date());
                moonAnimateStartTime.setMinutes(moonAnimateStartTime.getMinutes() - 5);
                moonAnimateTime = new Date(eclipseStats.circDates.getC1Date());
                moonStopAnimateTime = new Date(eclipseStats.circDates.getC4Date());
                moonStopAnimateTime.setMinutes(moonStopAnimateTime.getMinutes() + 5);
                moonInterval = setInterval(animateMoon, MOON_ANIMATE_INTERVAL);
            }
            else
            {
                header.html("No Eclipse");
                delayToast("Eclipse not visible.");
                moonPos = null;
                sunPos = null;
            }
        }
        else
        {
            moonPos = null;
            sunPos = null;
            header.html("No Eclipse");
            delayToast("Eclipse is not selected.");
        }
    }
}

function onSimRealTimeClick(event)
{
    $("#popSim").popup("close");
    
    if(moonInterval != null)
    {
        stopAnimateMoon();
        onMidSimClick(event);
    }
    else
    {
        if(selected_eclipse >= 0 )
        {
            var eclipseStats = eclipseInfo.getEclipse(selected_eclipse).calculateLocalCircumstances(latitude, longitude, altitude);
        
            if(eclipseStats.isVisible)
            {  
                moonAnimateStartTime = new Date(eclipseStats.circDates.getC1Date());
                moonAnimateStartTime.setMinutes(moonAnimateStartTime.getMinutes() - 30);
                moonAnimateTime = new Date();
                moonAnimateTime.setTime(moonAnimateTime.getTime() + dateOffset);
                moonStopAnimateTime = new Date(eclipseStats.circDates.getC4Date());
                moonStopAnimateTime.setMinutes(moonStopAnimateTime.getMinutes() + 30);
                
                if(moonAnimateTime >= moonAnimateStartTime && moonAnimateTime <= moonStopAnimateTime)
                {
                    bRealTimeMoon = true;
                    moonInterval = setInterval(animateMoon, MOON_ANIMATE_INTERVAL);
                }
                else
                {
                    bRealTimeMoon = false;
                    delayToast("Eclipse not yet occurring.");
                    moonPos = null;
                    sunPos = null;
                    onMidSimClick(event);
                }
            }
            else
            {
                header.html("No Eclipse");
                delayToast("Eclipse not visible.");
                moonPos = null;
                sunPos = null;
            }
        }
        else
        {
            moonPos = null;
            sunPos = null;
            header.html("No Eclipse");
            delayToast("Eclipse is not selected.");
        }
    }
}

function animateMoon()
{
   var positions = new PlanetPositionsAC();
   var animateScale = 1;
   
   if(!bRealTimeMoon)
   {
       animateScale = MOON_ANIMATE_SCALE;
   }
   else
   {
       moonAnimateTime = new Date();
       moonAnimateTime.setTime(moonAnimateTime.getTime() + dateOffset);
   }
   
   positions.setDate(moonAnimateTime);
   moonPos = positions.getMoonPosition(latitude, longitude, altitude);
   sunPos = positions.getSunPosition(latitude, longitude, altitude);
   updateMoonPos();
   header.html(moonAnimateTime.toLocaleTimeString());
   
   moonAnimateTime.setTime(moonAnimateTime.getTime() + (MOON_ANIMATE_INTERVAL * animateScale));
   
   if(moonAnimateTime.getTime() > moonStopAnimateTime.getTime())
   {
       moonAnimateTime.setTime(moonAnimateStartTime.getTime());
   }
}

function stopAnimateMoon()
{
    bRealTimeMoon = false;
    
    if(moonInterval != null)
    {
        clearInterval(moonInterval);
        moonInterval = null;
        delayToast("Stopping eclipse animation.");
    }
    
    moonAnimateTime = null;
    moonAnimateStartTime = null;
    moonAnimateStopTime = null;
    moonPos = null;
    sunPos = null
    updateMoonPos();
}



function initIDs()
{
    // TODO: Init any IDs for multiple use here.
    altID = $("#alt");
    latID = $("#lat");
    longID = $("#long");
    timeID = $("#time");

    sunDiv = $("#sun");
    moonDiv = $("#moon");
    
    header = $("#header");
}

function initPlugins()
{
	$( "[data-role='navbar']" ).navbar();
	$("#popupGPSError").popup();
        $( "#toast" ).popup();
        $("#popSim").popup();
        $("#simlist").listview();
        $( "#toast" ).popup({ transition: "fade", positionTo: "window" });
	$( "[data-role='header'], [data-role='footer']" ).toolbar();
	$( "body>[data-role='panel']" ).panel();
	$( "body > [data-role='panel'] [data-role='listview']" ).listview();
	$("#eclipse_list").listview();
	$("#eclipse_list_stats").listview();
        $("#timetravel").datebox();
        $("#timetravel").datebox({"closeCallback": "dateBoxClose"});
        $("#timetravel_time").datebox({"closeCallback": "parseNewDate"});
        $("#timetravel_time").datebox();
	resetEclipseListStats();
	$("#eclipse_list_stats").listview("refresh");
        
	try
	{
            elevator = new google.maps.ElevationService();
	}
	catch(error)
	{
            console.log("Unable to load Google Elevator service.");
            elevator = null;
	}
        
        try
        {
            geoCoder = new google.maps.Geocoder();
        }
        catch(error)
        {
            console.log("Unable to load Google geocoder service.");
            geoCoder = null;
        }
}

/*
 * Called on all link clicks.
 * Checks to see if its an internal click or outside click.
 * If you are running in Apache Cordova and its and outside link, the system browser is open.
 */
function onHrefClick(event)
{  
    if(typeof(cordova) != "undefined")
    {
        if(typeof(event.target.href) == "string")
        {
            var target = event.target.href;
            if(target.substr(0, 4) != "file")
            {
                event.preventDefault();
                window.open(event.target.href, "_system");
                return false;
            }
        }
    }
    
    return true;
}

function onInit()
{
    // So we can load from app cache, if necessary.
    $.ajaxSetup(
            {
                cache: true
            });

    initIDs();
    initPlugins();
    initBinders();

    $("#autoCity").hide();
    $("#license").load("license.txt");
    $("#changelog").load("changelog.html");
}

function onEclipseMapShow(event)
{
    eclipseMap.resizeMap();
    eclipseMap.setCenter(latitude, longitude);
    eclipseMap.setMarkerPosition(latitude, longitude);

    if (bManualLocation)
    {
        eclipseMap.setManualMarker();
    }
    else
    {
        eclipseMap.setGPSMarker();
    }
    $("#map-options").show();
}

// Map was clicked in manual mode and a latitude and longitude are given.
function onMapClick(lat, long)
{
    if (bCenterEclipseMap)
    {
        eclipseMap.setCenter(lat, long);
    }

    latitude = lat;
    longitude = long;

    getElevation();

    getGoogleTimeZone(latitude, longitude, onGoogleTimeZone);
}

function onEclipseMapHide(event)
{
    // TODO: On eclipse map hide.
    console.log("Eclipse map page hidden.");


}

function onEclipseSelectorShow(event)
{
    console.log("Eclipse selector shown.");
    scrollEclipseList();
}

function setSunDivPosition()
{
    window.setTimeout(function()
    {
        var height = getRealContentHeight();
        var width = getRealContentWidth();
        var short_dimension = height;

        if (width < short_dimension)
        {
            short_dimension = width;
        }

        sunDiv.width(Math.round(short_dimension / 2));

        var displaySunWidth = sunDiv.width();
        sunDiv.height(displaySunWidth);
        var sunPixelCenter = sunDiv.offset();
        sunPixelCenter.top = Math.round((height / 2) - (displaySunWidth / 2));
        sunPixelCenter.left = Math.round((width / 2) - (displaySunWidth / 2));
     
        sunDiv.offset(sunPixelCenter);
    }, 0);
}

/* Sets the Moon's postion on the the screen
 * per moon position and sun position objects
 * returned from PlanetPositions library.
 *
 * @returns {undefined}
 */
function updateMoonPos()
{
    window.setTimeout(function()
    {
        var displaySunWidth = sunDiv.width();
        var moonPixelCenter = sunDiv.offset();
        var moonWidth = displaySunWidth;
        
        if(moonPos != null && sunPos != null)   // Actual position info available.
        {
            moonWidth = Math.round(moonPos.diameter / sunPos.diameter * displaySunWidth);
            var pixelPerDeg = displaySunWidth / sunPos.diameter;
           
            moonPixelCenter.top = Math.round(moonPixelCenter.top - (cos(moonPos.decl - sunPos.decl) * (moonPos.decl - sunPos.decl) * pixelPerDeg));
            moonPixelCenter.left = Math.round(moonPixelCenter.left - (cos(moonPos.decl - sunPos.decl) * (moonPos.ra - sunPos.ra) * pixelPerDeg));
           
            moonDiv.css("background-color", "black");
        }
        else
        {
            moonDiv.css("background-color", "yellow");  // Otherwise make Moon disappear.
        }
        
        moonDiv.width(moonWidth);
        moonDiv.height(moonWidth);

        moonDiv.offset(moonPixelCenter); 
    }, 0);
}

function onSimulationPage(event)
{
    $("#simbutton").show();
    
    setSunDivPosition();
    
    onMidSimClick(event);
}

function getRealContentHeight() 
{
    var header = $( "[data-role='header']" );
    var footer = $( "[data-role='footer']" );
    var viewport_height = $(window).height();

    var content_height = viewport_height - (4 + (header.height() + footer.height()));
        
    return content_height;
}
function getRealContentWidth()
{
    var window_width = $(window).width();
    
    return window_width;
}

function onPageShow(event)
{
    if (bFirstPageShow)
    {
        bFirstPageShow = false;
        loadEclipseData();
    }

    bCountDownsShown = false;
    rightSizeObjects();

    if (popMessage.length > 0)   // If there are any toasts waiting to be popped, pop them and delete.
    {
        toastPop(popMessage);
        popMessage = "";
    }

    var current_page = $(":mobile-pagecontainer").pagecontainer("getActivePage").attr("id");
    $("#map-options").hide();
    $("#simbutton").hide();
    
    stopAnimateMoon();
    
    if(current_page !== "eclipse-map")
    {
        stopShadowAnimation();
    }
    
    if (current_page === "eclipse-map")
    {
        header.html("Eclipse Map");
        onEclipseMapShow(event);
    }
    else if (current_page === "eclipse")
    {
        header.html("Select Eclipse");
        onEclipseSelectorShow(event);
    }
    else if (current_page === "countdowns")
    {
        header.html("Circumstances");
        onCountDownsPageShow(event);
    }
    else if (current_page === "about")
    {
        header.html("About");
    }
    else if (current_page === "simulation")
    {
        header.html("Simulation");
        onSimulationPage();
    }

   updateHighlights();
}

function onPageTransistion(event)
{
	var current = $( ":mobile-pagecontainer" ).pagecontainer( "getActivePage" ).attr("id");
	
	if(current === "eclipse-map")
	{
            onEclipseMapHide(event);
	}
}

function stopCoordUpdate()
{
	if(coordInterval)
	{
		clearInterval(coordInterval);
		coordInterval = null;
	}
}

function updateCoords()
{
	var time = new Date();
        time.setTime(time.getTime() + dateOffset);
        var localTimeZoneOffset = time.getTimezoneOffset();
        var date_options = {};
        
        if(gTimeZone != null && gTimeZoneID != null)
        {
            if(localTimeZoneOffset != gTimeZone)
            {
                date_options = {timeZone: gTimeZoneID};
            }
        }
       
	latID.html("Lat:<br/>" + latitude.toFixed(2));
	longID.html("Long:<br/> " + longitude.toFixed(2));
	altID.html("Alt:<br/> " + Number(altitude * metersToFeet).toFixed(2) + " ft");
        
        try
        {
            timeID.html("Time:<br/>" + time.toLocaleTimeString(TIME_LOCALE, date_options));
        }
        catch(error)    // FOR INTERNET EXPLORER TODO: FIX THIS!!!
        {
            delete date_options.timeZone;
            timeID.html("Time:<br/>" + time.toLocaleTimeString(TIME_LOCALE, date_options));
        }
	
	if(bCenterEclipseMap)
	{
            eclipseMap.setCenter(latitude, longitude);
	}
	if(!bManualLocation)
	{
            eclipseMap.setMarkerPosition(latitude, longitude);
	}
}

function updateHighlights()
{
    var current = $(":mobile-pagecontainer").pagecontainer("getActivePage").attr("id");

    // Remove active class from nav buttons
    $("[data-role='listview'] a.ui-btn-active").removeClass("ui-btn-active");

    // Add active class to current nav button
    $("[data-role='listview'] a").each(function()
    {
        var text = $(this).attr("href").slice(1);
        if (text === current)
        {
            $(this).addClass("ui-btn-active");
        }
    });

    if (bCenterEclipseMap)
    {
        $("#centerloc").addClass("ui-btn-active");
    }
    else
    {
        $("#centerloc").removeClass("ui-btn-active");
    }

    if (bManualLocation)
    {
        $("#manualloc").addClass('ui-btn-active');
    }
    else
    {
        $("#manualloc").removeClass('ui-btn-active');
    }

    if (bAnimating)
    {
        $("#animate").addClass('ui-btn-active');
    }
    else
    {
        $("#animate").removeClass('ui-btn-active');
    }

    if (bRealTimeShadow)
    {
        $("#realtime").addClass('ui-btn-active');
    }
    else
    {
        $("#realtime").removeClass('ui-btn-active');
    }	
}

 $( document ).on( "mobileinit", onMobileInit);

window.addEventListener('load', onWindowLoad, false);

function onCacheUpdateReady(event)
{
    if (window.applicationCache.status == window.applicationCache.UPDATEREADY)
    {
        // Browser downloaded a new app cache.
        // Swap it in and reload the page to get the new version.
        console.log("Cache update ready, swapping.");
        window.applicationCache.swapCache();
        window.location.reload();
    }
    else
    {
        // Manifest didn't changed. Nothing new yet.
    }
}

function onWindowLoad(event)
{
    //Check if a new cache is available
    console.log("Window load fired.");
    if(typeof(window.applicationCache) != "undefined")
    {
        window.applicationCache.addEventListener('updateready', onCacheUpdateReady, false);
    }
}

$(function()
{
    onInit();
});
