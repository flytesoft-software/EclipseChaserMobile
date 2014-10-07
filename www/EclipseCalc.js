/*
 * EclipseCalc.js
 * Eclipse Calculator Object Oriented JavaScript Library
 * Conversions and updates by: Joshua Berlin
 * Last Edited: 10-07-2014
 * Version 1 by Chris O'Byrne and Fred Espenak - 2007.
 * (based on "Eclipse Calculator" by Chris O'Byrne and Stephen McCann - 2003)
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

// Leaving in old array references for reference:
// Observer constants -
// (0) North Latitude (radians)
// (1) West Longitude (radians)
// (2) Altitude (metres)
// (3) West time zone (hours)
// (4) rho sin O'
// (5) rho cos O'
// (6) index into the elements array for the eclipse in question
//
// Note that correcting for refraction will involve creating a "virtual" altitude
// for each contact, and hence a different value of rho and O' for each contact!
//
//
// Eclipse circumstances
//  (0) Event type (C1=-2, C2=-1, Mid=0, C3=1, C4=2)
//  (1) t
// -- time-only dependent circumstances (and their per-hour derivatives) follow --
//  (2) x
//  (3) y
//  (4) d
//  (5) sin d
//  (6) cos d
//  (7) mu
//  (8) l1
//  (9) l2
// (10) dx
// (11) dy
// (12) dd
// (13) dmu
// (14) dl1
// (15) dl2
// -- time and location dependent circumstances follow --
// (16) h
// (17) sin h
// (18) cos h
// (19) xi
// (20) eta
// (21) zeta
// (22) dxi
// (23) deta
// (24) u
// (25) v
// (26) a
// (27) b
// (28) l1'
// (29) l2'
// (30) n^2
// -- observational circumstances follow --
// (31) p
// (32) alt
// (33) q
// (34) v
// (35) azi
// (36) m (mid eclipse only) or limb correction applied (where available!)
// (37) magnitude (mid eclipse only)
// (38) moon/sun (mid eclipse only)
// (39) calculated local event type for a transparent earth (mid eclipse only)
//      (0 = none, 1 = partial, 2 = annular, 3 = total)
// (40) event visibility
//      (0 = above horizon, 1 = below horizon, 2 = sunrise, 3 = sunset, 4 = below horizon, disregard)
//

//
// Eclipse Elements
//
// First line -
//  (0) Julian date of maximum eclipse
//  (1) t0 - the TDT hour at which t=0
//  (2) tmin - the lowest allowed value of t
//  (3) tmax - the highest allowed value of t
//  (4) dUTC - the difference between the civilian "GMT" timescale and TDT
//  (5) dT - the difference between UT and TDT
// Second line -
//  (6) X0, X1, X2, X3 - X elements
// Third line -
// (10) Y0, Y1, Y2, Y3 - Y elements
// Fourth line -
// (14) D0, D1, D2 - D elements
// Fifth line -
// (17) M0, M1, M2 - mu elements
// Sixth line -
// (20) L10, L11, L12 - L1 elements
// Seventh line -
// (23) L20, L21, L22 - L2 elements
// Eigth line -
// (26) tan f1
// (27) tan f2
//

var VALID_LINE_LENGTH = 115;				// Valid length of eclipse data on each line.x
var DATE_START_IDX = 13;					// Date information for eclipse starts here.
var LAT_START_IDX = 81;						// Latitude for eclipse midpoint starts here in catalog.
var LAT_LENGTH = 4;							// Latitude data length in catalog.
var LONG_START_IDX = 87;					// Longitude data starts here in catalog.
var LONG_LENGTH = 5;						// Longitude data length in catalog.
var DATE_STRING_LENGTH = 21;				// Date string length in catalog data.
var ECLIPSE_TYPE_IDX = 56;					// Index in each line of eclipse type in catalog data.
var CALC_ITERATIONS = 50;					// How many times to iterate the circumstance calculator.

// Position Object
// lat: optional float number, north is positive, south is negative.
// long: optional float number, west is negative, east is positive.
// alt: option float number, altitude in meters.
function Position(latIN, longIN, altIN)
{
    this.latitude = 0.0;
    this.longitude = 0.0;
    this.altitude = 0.0;
    
    // Same as constructor.
    this.setPosition = function(latIN, longIN, altIN)
    {
        if (typeof (latIN) == "number")
        {
            this.latitude = latIN;
        }
        
        if (typeof (longIN) == "number")
        {
            this.longitude = longIN;
        }
        
        if (typeof (altIN) == "number")
        {
            this.altitude = altIN;
        }		
    };
    
    this.setPosition(latIN, longIN, altIN);
}

/*
 * Object containing north, south, east, and west values
 * Used to limit search area for umbral and penumbral shadows.
 */
function PositionLimits()
{
    var eastLimit = 0.0;
    var westLimit = 0.0;
    var southLimit = 0.0;
    var northLimit = 0.0;
    
    this.setEastLimit = function(limit)
    {
        if (typeof (limit) == "number")
        {
            if (limit <= 180.0 && limit >= -180.0)
            {
                eastLimit = limit;
            }
        }
    };
    
    this.setWestLimit = function(limit)
    {
        if (typeof (limit) == "number")
        {
            if (limit <= 180.0 && limit >= -180.0)
            {
                westLimit = limit;
            }
        }
    };
    
    this.setNorthLimit = function(limit)
    {
        if (typeof (limit) == "number")
        {
            if (limit <= 90.0 && limit >= -90.0)
            {
                northLimit = limit;
            }
        }
    };
    
    this.setSouthLimit = function(limit)
    {
        if (typeof (limit) == "number")
        {
            if (limit <= 90.0 && limit >= -90.0)
            {
                southLimit = limit;
            }
        }
    };
    
    this.getNorthLimit = function()
    {
        return northLimit;
    };
    
    this.getSouthLimit = function()
    {
        return southLimit;
    };
    
    this.getWestLimit = function()
    {
        return westLimit;
    };
    
    this.getEastLimit = function()
    {
        return eastLimit;
    };
}

/*
 * Object containing circumstance dates.
 * C1 date, C2 date, C3 date, C4 date, Mid date
 * set Functions will only allow valid dates
 * get functions return null upon no date.
 * Invalid dates are null. 
 */
function CircumstanceDates(circumstances)
{
    this.c1Date = null;
    this.c2Date = null;
    this.midDate = null;
    this.c3Date = null;
    this.c4Date = null;
    
    this.setC1Date = function(date)
    {
        if (typeof (date.getTime) == "function")
        {
            if (!isNaN(date.getTime()))
            {
                this.c1Date = date;
            }
        }
    };
    
    this.setC2Date = function(date)
    {
        if (typeof (date.getTime) == "function")
        {
            if (!isNaN(date.getTime()))
            {
               if(date.getTime() == 0)
               {
                   console.log("Zero found.");
               }
               this.c2Date = date;
            }
        }
    };
    
    this.setMidDate = function(date)
    {
        if (typeof (date.getTime) == "function")
        {
            if (!isNaN(date.getTime()))
            {
                this.midDate = date;
            }
        }
    };
    
    this.setC3Date = function(date)
    {
        if (typeof (date.getTime) == "function")
        {
            if (!isNaN(date.getTime()))
            {
                this.c3Date = date;
            }
        }
    };
    
    this.setC4Date = function(date)
    {
        if (typeof (date.getTime) == "function")
        {
            if (!isNaN(date.getTime()))
            {
               this.c4Date = date;
            }
        }
    };
    
    this.getC1Date = function()
    {
        if (this.c1Date != null)
        {
            return new Date(this.c1Date);
        }
        return null;
    };
    
    this.getC2Date = function()
    {
        if (this.c2Date != null)
        {
            return  new Date(this.c2Date);
        }
        return null;
    };
    
    this.getMidDate = function()
    {
        if (this.midDate != null)
        {
            return  new Date(this.midDate);
        }
        return null;
    };
    
    this.getC3Date = function()
    {
        if (this.c3Date != null)
        {
            return  new Date(this.c3Date);
        }
        return null;
    };
    
    this.getC4Date = function()
    {
        if (this.c4Date != null)
        {
            return  new Date(this.c4Date);
        }
        return null;
    };
    
    /*
     * Copy constructor function
     * @param {CircumstanceDates} circumstances
     * @returns {CircumstanceDates}
     */
    this.set = function(circumstances)
    {
        if(typeof(circumstances) == 'object')
        {
            if(circumstances != null)
            {
                if(circumstances.c1Date != null)
                {
                    this.c1Date = new Date(circumstances.c1Date);
                }
                if(circumstances.c2Date != null)
                {
                    this.c2Date = new Date(circumstances.c2Date);
                }
                if(circumstances.midDate != null)
                {
                    this.midDate = new Date(circumstances.midDate);
                }
                if(circumstances.c3Date != null)
                {
                    this.c3Date = new Date(circumstances.c3Date);
                }
                if(circumstances.c4Date != null)
                {
                    this.c4Date = new Date(circumstances.c4Date);
                }
            }
        }
    };
    
    this.set(circumstances);
}


// TimeSpan Object
// Retrieves the time span between two times
// start_time: optional Date() object or Integer value of the number of milliseconds.
// end_time: optional Date() object or Interger value of the number of milliseconds.

// If no inputs, zero time span is created.
// Only one input is used to create TimeSpan object of a certain number of milliseconds.
function TimeSpan(start_time, end_time)
{
    var rawMilliSeconds = 0;
    var milliseconds = 0;
    var seconds = 0;
    var minutes = 0;
    var hours = 0;
    var days = 0;
    
    // Same as constructor function
    this.setSpan = function(start_time, end_time)
    {
        if (typeof (end_time) == "undefined" && typeof (start_time) == "undefined")
        {
            rawMilliSeconds = 0;
        }
        else if (typeof (end_time) == "number" && typeof (start_time) == "number")
        {
            rawMilliSeconds = end_time - start_time;
        }
        else if (typeof (end_time) == "undefined" && typeof (start_time) == "number")
        {
            rawMilliSeconds = start_time;
        }
        else if (typeof (end_time.getTime) == "undefined" && typeof (start_time.getTime) == "function")
        {
            rawMilliSeconds = start_time.getTime();
        }
        else if (typeof (end_time.getTime) == "function" && typeof (start_time.getTime) == "function")
        {
            rawMilliSeconds = end_time.getTime() - start_time.getTime();
        }
        else
        {
            rawMilliSeconds = 0;
        }
        
        days = Math.abs(rawMilliSeconds / (24 * 60 * 60 * 1000));
        
        if (days >= 1)
        {
            hours = ((days - Math.floor(days)) * 24);
        }
        else
        {
            hours = days * 24;
        }
        
        if (hours >= 1)
        {
            minutes = ((hours - Math.floor(hours)) * 60);
        }
        else
        {
            minutes = hours * 60;
        }
        
        if (minutes >= 1)
        {
            seconds = ((minutes - Math.floor(minutes)) * 60);
        }
        else
        {
            seconds = minutes * 60;
        }
        
        if (seconds >= 1)
        {
            milliseconds = Math.round(((seconds - Math.floor(seconds)) * 1000));
        }
        else
        {
            milliseconds = Math.round(seconds * 1000);
        }
        
        return rawMilliSeconds;
    };
    
    /*
     * Returns total number of milliseconds in time span.
     * @returns {Number}
     */
    this.getRawMilliSeconds = function()
    {
        return rawMilliSeconds;        
    };
    
    // Test whether count is negative.
    this.checkNegative = function()
    {
        if (rawMilliSeconds < 0)
        {
            return true;
        }
        
        return false;
    };
    
    // Returns integer number of days
    // Part of DD:HH:MM:SS
    this.getDays = function()
    {
        return Math.floor(days);
    };
    
    // Returns integer number of hours.
    // Part of DD:HH:MM:SS
    this.getHours = function()
    {
        return Math.floor(hours);
    };
    
    // Returns integer number of minutes
    // Part of DD:HH:MM:SS
    this.getMinutes = function()
    {
        return Math.floor(minutes);
    };
    
    // Returns integer number of seconds
    // Part of DD:HH:MM:SS
    this.getSeconds = function()
    {
        return Math.floor(seconds);
    };
    
    // Returns remainder millisconds
    // Part of DD:HH:MM:SS:MMMM
    this.getMilliseconds = function()
    {
        return milliseconds;	
    };
    
    // Returns time span string as
    // *D:HH:MM:SS
    // Minimal string: MM:SS
    this.toTimeString = function()
    {
        var ret_string = "";
        var wDays = Math.floor(this.getDays());
        var wHours = Math.floor(this.getHours());
        var wMinutes = Math.floor(this.getMinutes());
        var wSeconds = Math.floor(this.getSeconds());
        
        if (this.checkNegative())
        {
            ret_string += "-";
        }
        
        if (wDays > 0)
        {
            ret_string += wDays + ":";
        }
        
        if (wHours >= 10)
        {
            ret_string += "" + wHours + ":";
        }
        if (wHours > 0 && wHours < 10)
        {
            ret_string += "0" + wHours + ":";
        }
        if (wHours == 0 && wDays > 0)
        {
            ret_string += "00:";
        }
        if (wMinutes >= 10)
        {
            ret_string += "" + wMinutes + ":";
        }
        if (wMinutes < 10 && wMinutes > 0)
        {
            ret_string += "0" + wMinutes + ":";
        }
        if (wMinutes == 0)
        {
            ret_string += "00:";
        }
        
        if (wSeconds >= 10)
        {
            ret_string += "" + wSeconds;
        }
        if (wSeconds > 0 && wSeconds < 10)
        {
            ret_string += "0" + wSeconds;
        }
        if (wSeconds == 0)
        {
            ret_string += "00";
        }
        
        return ret_string;	
    };
    
    return this.setSpan(start_time, end_time);
}

// Returns UTC datetime object
// from the given Julian Day
function julianDayToTime(julianDay)
{
    /**********
     /** So this gets really close, but the hours to days are slightly off, 
     * TODO: Improve this? 
     
     var J = Math.floor(julianDay);
     var hours = (julianDate - J) * 24;
     var minutes = (hours - Math.floor(hours)) * 60;
     var seconds = (minutes - Math.floor(minutes)) * 60;
     
     hours = Math.floor(hours);
     minutes = Math.floor(minutes);
     seconds = Math.round(seconds);
     
     var y = 4716, v = 3,
     j = 1401, u = 5,
     m = 2, s = 153,
     n = 12, w = 2,
     r = 4, B = 274277,
     p = 1461, C = -38;
     
     var f = Math.floor(J + j + (((4 * J + B) / 146097) * 3) / 4 + C);
     var e = Math.floor(r * f + v);
     var g = Math.floor((e % p) / r);
     var h = Math.floor(u * g + w);
     var day = Math.floor((h % s) / u + 1);
     var month = Math.floor(((h / s + m) % n) + 1);
     var year = Math.floor((e / p) - y + (n + m - month) / n);
     
     this.eclipseDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, 0));	
     *******/
    
    /*
     * OK, well just convert everything to milliseconds and add 327 days, and poof it works!
     * Won't work for all years, but does seem to be happy up till 2100 at least.
     */
    var julian_milliseconds = julianDay * 24 * 60 * 60 * 1000;
    var julian_correction = 327 * 24 * 60 * 60 * 1000;
    var utc_date = new Date(Date.UTC(-4713, 0, 1, 12, 0, 0, 0));
    var start_milliseconds = utc_date.getTime();
    
    utc_date.setTime(start_milliseconds + julian_milliseconds + julian_correction);
    
    return utc_date;
}
;

// Object containing mathematical constants for the observer.
// latitude: required Number() north lat is positive in decimal degrees.
// longitude: required Number() west longitude is positive in decimal degrees.
// inAlt: required Number() altitude in meters.
function ObserverConstants(latitude, longitude, inAlt)
{	
    // Latitude to radians.
    this.latRadians = latitude * Math.PI / 180.0;
    
    // Longitude to radians
    this.longRadians = (-1) * longitude * Math.PI / 180.0;
    
    this.altitude = inAlt;
    
    this.timeZone = 0;		// Setting to zero for now, always getting UTC information.
    
    // Get altitude in meters.
    this.getAltitude = function()
    {
        return this.altitude;
    };
    
    // Return latitude in radians
    this.getLatRadians = function()
    {
        return this.latRadians;
    };
    
    this.getLongRadians = function()
    {
        return this.longRadians;
    };
    
    this.getTimeZone = function()
    {
        return this.timeZone;
    };
    
    // Get the observer's geocentric position
    var value = Math.atan(0.99664719 * Math.tan(this.getLatRadians()));
    
    this.rhoSinO = 0.99664719 * Math.sin(value) + (this.getAltitude() / 6378140.0) * Math.sin(this.getLatRadians());
    this.rhoCosO = Math.cos(value) + (this.getAltitude() / 6378140.0 * Math.cos(this.getLatRadians()));
    
    this.getRhoSinO = function()
    {
        return this.rhoSinO;
    };
    
    this.getRhoCosO = function()
    {
        return this.rhoCosO;
    };
}

/*
 * Object containing the variables for the calculated eclipse circumstances.
 */
function EclipseCircumstances()
{
    // Eclipse circumstances
    this.eventType = new Number();	// 0 // Event type (C1=-2, C2=-1, Mid=0, C3=1, C4=2)
    this.t = new Number();			// 1
    
    // Time-only dependent circumstances (and their per-hour derivatives) follow --
    this.x = new Number();			// 2
    this.y = new Number();			// 3
    this.d = new Number();			// 4
    this.sinDelta = new Number();	// 5
    this.cosDelta = new Number();	// 6
    this.mu = new Number();			// 7
    this.l1 = new Number();			// 8
    this.l2 = new Number();			// 9
    this.dx = new Number();			// 10
    this.dy = new Number();			// 11
    this.dd = new Number();			// 12
    this.dmu = new Number();		// 13
    this.dl1 = new Number();		// 14
    this.dl2 = new Number();		// 15
    
    // -- time and location dependent circumstances follow --
    this.h = new Number();			// 16
    this.sinH = new Number();		// 17
    this.cosH = new Number();		// 18
    this.xi = new Number();			// 19
    this.eta = new Number();		// 20
    this.zeta = new Number();		// 21
    this.dxi = new Number();		// 22
    this.deta = new Number();		// 23
    this.u = new Number();			// 24
    this.vLoc = new Number();		// 25
    this.a = new Number();			// 26
    this.b = new Number();			// 27
    this.l1prime = new Number();	// 28
    this.l2prime = new Number();	// 29
    this.nSquared = new Number();	// 30
    
    // -- observational circumstances follow --
    this.p = new Number();			// 31
    this.alt = new Number();		// 32
    this.q = new Number();			// 33
    this.vObs = new Number();		// 34
    this.azi = new Number();		// 35
    this.mid = new Number();		// 36	// mid eclipse only or limb correction applied (where available!)
    this.magnitude = new Number();	// 37	// mid eclipse only
    this.moonSun = new Number();	// 38	// mid eclipse only
    this.localType = new Number();	// 39	// calculated local event type for a transparent earth (0 = none, 1 = partial, 2 = annular, 3 = total)
}

// Object describing the local circumstances of a solar eclipse
// for a particular observer's location on Earth.
function ObserverCircumstances()
{
    this.isVisible = false;			// Is the eclipse visible at all from the location?
    this.eclipseType = "None";		// What type of eclipse is visible at location?  "None", "Total", "Annular", or "Partial"
    this.magnitude = new Number();	// Magnitude of the eclipsee
    this.coverage = new Number();	// The coverage of the Sun.
    this.depth = new Number();		// How deep into the (ant)umbral shadow. 100% = centered, 0% outside the (ant)umbral shadow.
    this.pAngle = 0.0;                  // Angle between north point of Sun and contact point with Moon?
    this.northOfCenter = true;		// North of central line of eclipse? 
    this.midAltitude = 0.0;			// Height above horizon for mid eclipse, in radians.  Negative is below horizon.
    this.c1Altitude = 0.0;
    this.c4Altitude = 0.0;
    
    this.circDates = new CircumstanceDates();	// Object containing dates for c1, c2, mid, c3, and c4 circumstances.
    
    this.firstContactBelowHorizon = false;		// Does the eclipse start before sunrise?
    this.secondContactBelowHorizon = false;		// Second contact starts before sunrise?
    this.midEclipseBelowHorizon = false;		// Mid eclipse happens before sunrise.
    this.thirdContactBelowHorizon = false;		// Third contact occurs after sunset.
    this.fourthContactBelowHorizon = false;		// Fourth contact occurs after sunset.
    
    this.c1c4TimeSpan = new TimeSpan();			// Entire eclipse duration time span.
    this.c2c3TimeSpan = new TimeSpan();			// Total or annular phase duration.
}

// Object holding Besselian elements for eclipse
function Besselian()
{
    this.julianDayMax = new Number();	// 0
    this.t0 = new Number();				// 1
    this.tMin = new Number();			// 2
    this.tMax = new Number();			// 3
    this.dUTC = new Number();			// 4
    this.dT = new Number();				// 5
    this.x0 = new Number();				// 6
    this.x1 = new Number();				// 7
    this.x2 = new Number();				// 8
    this.x3 = new Number();				// 9
    this.y0 = new Number();				// 10
    this.y1 = new Number();				// 11
    this.y2 = new Number();				// 12
    this.y3 = new Number();				// 13
    this.d0 = new Number();				// 14
    this.d1 = new Number();				// 15
    this.d2 = new Number();				// 16
    this.m0 = new Number();				// 17
    this.m1 = new Number();				// 18
    this.m2 = new Number();				// 19
    this.l10 = new Number();			// 20
    this.l11 = new Number();			// 21
    this.l12 = new Number();			// 22
    this.l20 = new Number();			// 23
    this.l21 = new Number();			// 24
    this.l22 = new Number();			// 25
    this.tanF1 = new Number();			// 26
    this.tanF2 = new Number();			// 27
} 

/*
 * Object holds and calculates individual eclipse
 * @param {Object} eclipse: Eclipse object || Eclipse JSON Object
 * @returns {EclipseData}
 */
function EclipseData(/* Object */ eclipse)
{
    var MAX_LENGTH_TIME_CENTRAL_ECLIPSE = 751000;       // Longest theortical annular eclipse length in milliseconds.
    
    // Helper functions:
    function radToDeg(angleRad)
    {
        return (180.0 * angleRad / Math.PI);
    }

    function degToRad(angleDeg)
    {
        return (Math.PI * angleDeg / 180.0);
    }
    
    function deltaLongitude(long_1, long_2)
    {
        var val = long_1 - long_2;
        
        if(val > 180.0)
        {
            val -= 180.0;
        }
        if(val < -180.0)
        {
            val += 180.0;
        }
        
        return Math.abs(val);
    }

// How many westerly degrees seperate out the two values
    function degreesWest(long_1, long_2)
    {
        var test = 0.0;

        if ((long_1 > 0.0 && long_2 > 0.0) || (long_1 < 0.0 && long_2 < 0.0))
        {
            test = long_1 - long_2;
            if (test < 0.0)
            {
                test += 360.0;
            }
            return test;
        }
        else
        {
            if (long_1 > 0.0)
            {
                return (long_1 + Math.abs((long_2)));
            }
            else
            {
                return (180.0 - Math.abs(long_1) + 180.0 - Math.abs(long_2));
            }
        }
    }
    
   /*
    * oldLong: required number, longitude in degrees.
    * increment: required number, how much to increase or decrease value
    * Returns: new longitude number.
    */
    function incrementLong(oldLong, increment)
    {
        var outLong = oldLong + increment;

        if (outLong > 180.0)
        {
            outLong -= 360.0;
        }

        if (outLong < -180.0)
        {
            outLong += 360.0;
        }

        return outLong;
    }

/*
    * oldLat: required number, old latitude value to be changed.
    * increment: required number, how much to change latitude by.
    * return: new latitude.
    */
    function incrementLat(oldLat, increment)
    {
        var outLat = oldLat + increment;

        if (outLat > 90.0)
        {
            outLat = 90.0;
        }
    
        if (outLat < -90.0)
        {
            outLat = -90.0;
        }

        return outLat;
    }

    /*
    * Returns true is long_2 is east of long_1
     */
    function isEast(long_1, long_2)
    {
        return (!isWest(long_1, long_2));
    }

   /*
    * Test if long_2 is West of long_1
    * Returns true if long_2 is west of long_1
    */
    function isWest(long_1, long_2)
    {
	var test = degreesWest(long_1, long_2);
	
        if(test < 180.0 && test > 0.0)
        {
            return true;
        }
        
        return false;
    }

   /*
    * Helper function for sorting by longitude from west to east
    */
    function sortWest(pos_a, pos_b)
    {
        if(pos_a.longitude == pos_b.longitude)
        {
            return 0;
        }
        if(isWest(pos_a.longitude, pos_b.longitude))
        {
            return 1;
        }
    
        return -1;
    }

    function sortEast (pos_a, pos_b)
    {
        if(pos_a.longitude == pos_b.longitude)
        {
            return 0;
        }     
        if(isEast(pos_a.longitude, pos_b.longitude))
        {
             return 1;
        }   
    
        return -1;
    }


    this.type = new String();
    
    this.maxEclipseDate = new Date();
    
    this.midEclipsePoint = new Position();
    
    this.besselianElements = new Besselian();
    
    this.observerConstants = null;
    this.c1Circumstances = new EclipseCircumstances();
    this.c2Circumstances = new EclipseCircumstances();
    this.midCircumstances = new EclipseCircumstances();
    this.c3Circumstances = new EclipseCircumstances();
    this.c4Circumstances = new EclipseCircumstances();
    
    // TODO: Performance/Memory issue?  Keeping these in memory will be costly, destroy function?
    this.northPenumbraLine = null;
    this.southPenumbraLine = null;
    this.centralLine = null;
    this.southUmbraLine = null;
    this.northUmbraLine = null;
    this.westLimitLine = null;
    this.eastLimitLine = null;
    
    this.centralLineTimes = null;		// An array of times along the drawn central line.
    this.southUmbraLineTimes = null; 	// An array of times along the south umbra line.
    this.northUmbraLineTimes = null;	// An array of times along the north umbra line.
    this.westPenumbraLineTimes = null;	// An array of times along the west penumbra limit line.
    this.eastPenumbraLineTimes = null;	// An array of times along the east penumbra limit line.
    
    /*
     * Deep copies line times, so we can work with JSON objects.
     * @param {CircumstanceDates} lineTimes
     * @returns {array of CircumstanceDates}
     */
    this.deepCopyLineTimes = function(lineTimes)
    {
        var newLineTimes = [];
        
       if(typeof(lineTimes) == 'object')
        {
            if(lineTimes != null)
            {
                for(var i = 0; i < lineTimes.length; i++)
                {
                    newLineTimes.push(new CircumstanceDates(lineTimes[i]));
                }
            }      
        }
        
        return newLineTimes;
    };
    
    /* Copy constructor for this object.
     * @param {EclipseData} eclipse
     * @returns {EclipseData}
     */
    this.set = function(eclipse)
    {
        if(typeof(eclipse) == 'object')
        {
            if(eclipse != null)
            {
                this.type = eclipse.type;
        
                this.maxEclipseDate = eclipse.maxEclipseDate;
    
                this.midEclipsePoint = eclipse.midEclipsePoint;
    
                this.besselianElements = eclipse.besselianElements;
    
                this.observerConstants = eclipse.observerConstants;
                this.c1Circumstances = eclipse.c1Circumstances;
                this.c2Circumstances = eclipse.c2Circumstances;
                this.midCircumstances = eclipse.midCircumstances;
                this.c3Circumstances = eclipse.c3Circumstances;
                this.c4Circumstances = eclipse.c4Circumstances;
    
                // TODO: Performance/Memory issue?  Keeping these in memory will be costly, destroy function?
                this.northPenumbraLine =  eclipse.northPenumbraLine;
                this.southPenumbraLine = eclipse.southPenumbraLine;
                this.centralLine = eclipse.centralLine;
                this.southUmbraLine = eclipse.southUmbraLine;
                this.northUmbraLine = eclipse.northUmbraLine;
                this.westLimitLine = eclipse.westLimitLine;
                this.eastLimitLine = eclipse.eastLimitLine;
    
                this.centralLineTimes = this.deepCopyLineTimes(eclipse.centralLineTimes);		// An array of times along the drawn central line.
                this.southUmbraLineTimes = this.deepCopyLineTimes(eclipse.southUmbraLineTimes); 	// An array of times along the south umbra line.
                this.northUmbraLineTimes = this.deepCopyLineTimes(eclipse.northUmbraLineTimes);	// An array of times along the north umbra line.
                this.westPenumbraLineTimes = this.deepCopyLineTimes(eclipse.westPenumbraLineTimes);	// An array of times along the west penumbra limit line.
                this.eastPenumbraLineTimes = this.deepCopyLineTimes(eclipse.eastPenumbraLineTimes);
            }
        }
    };
    
    /*
     * Calculate the local circumstance for eclipse for a particular
     * location on Earth.
     * latitude: required Number()
     * longitude: required Number()
     * elevation_in: optional Number() - defaults to zero. 
     * returns ObserverCircumstances object.
     */
    this.calculateLocalCircumstances = function(latitude, longitude, elevation_in)
    {
        var elevation = 0;
        var calc_longitude = longitude;
        var observerCircumstances = new ObserverCircumstances();
      
        if (elevation_in)
        {
            if (!isNaN(elevation_in))
            {
                elevation = elevation_in;
            }
        }
        
        this.observerConstants = new ObserverConstants(latitude, calc_longitude, elevation);
        
        this.getAll();
        
        // These items are still used even when outside circumstances
        // How far and to which side are we outside the circumstances?
        observerCircumstances.magnitude = Number(100 * this.midCircumstances.magnitude);
        
        observerCircumstances.northOfCenter = (this.midCircumstances.vLoc < 0.0);
        observerCircumstances.midAltitude = this.getAlt(this.midCircumstances);
        
        observerCircumstances.c1Altitude = this.getAlt(this.c1Circumstances);
        observerCircumstances.c4Altitude = this.getAlt(this.c4Circumstances);
        
        observerCircumstances.circDates.setC1Date(this.getDate(this.c1Circumstances));
        observerCircumstances.circDates.setMidDate(this.getDate(this.midCircumstances));
        observerCircumstances.circDates.setC4Date(this.getDate(this.c4Circumstances));
        observerCircumstances.circDates.setC2Date(this.getDate(this.c2Circumstances));
        observerCircumstances.circDates.setC3Date(this.getDate(this.c3Circumstances));
        
        observerCircumstances.coverage = this.getCoverage();
        observerCircumstances.depth = this.getDepth();
        observerCircumstances.pAngle = this.getP(this.midCircumstances);
        
        if (this.midCircumstances.localType > 0)	// OK there's an event.
        {
            if (this.checkHorizons(observerCircumstances))
            {
                observerCircumstances.isVisible = true;
                
                if (observerCircumstances.circDates.getC1Date() != null && observerCircumstances.circDates.getC4Date() != null)
                {
                    observerCircumstances.c1c4TimeSpan.setSpan(observerCircumstances.circDates.getC1Date(), observerCircumstances.circDates.getC4Date());
                }
                
                switch (this.midCircumstances.localType)
                {
                    case 1:
                        observerCircumstances.eclipseType = "Partial";
                        break;
                        
                    case 2:
                        observerCircumstances.eclipseType = "Annular";
                        if (observerCircumstances.circDates.getC2Date() != null && observerCircumstances.circDates.getC3Date() != null)
                        {
                            observerCircumstances.c2c3TimeSpan.setSpan(observerCircumstances.circDates.getC2Date(), observerCircumstances.circDates.getC3Date());
                        }
                        break;
                        
                    case 3:
                        observerCircumstances.eclipseType = "Total";
                        if (observerCircumstances.circDates.getC2Date() != null && observerCircumstances.circDates.getC3Date() != null)
                        {
                            observerCircumstances.c2c3TimeSpan.setSpan(observerCircumstances.circDates.getC2Date(), observerCircumstances.circDates.getC3Date());
                        }
                        break;
                        
                    default:
                        observerCircumstances.eclipseType = "None";
                        break;				
                }
            }
        }
        
        return observerCircumstances;
    };
    
    // Check to see if all events in a partial eclipse are below horizon.
    // Also fills in "BelowHorizon" Boolean values for observerCircumstances
    // Input Object: ObserverCircumstances
    // Returns true if something occurs above horizon.
    this.checkHorizons = function(observer)
    {
        if (this.getAlt(this.c1Circumstances) < 0.0)
        {
            observer.firstContactBelowHorizon = true;
        }
        else
        {
            observer.firstContactBelowHorizon = false;
        }
        
        if (this.getAlt(this.midCircumstances) < 0.0)
        {
            observer.midEclipseBelowHorizon = true;
        }
        else
        {
            observer.midEclipseBelowHorizon = false;
        }
        
        if (this.getAlt(this.c4Circumstances) < 0.0)
        {
            observer.fourthContactBelowHorizon = true;
        }
        else
        {
            observer.fourthContactBelowHorizon = false;
        }
        
        if (this.getAlt(this.c2Circumstances) < 0.0)
        {
            observer.secondContactBelowHorizon = true;
        }
        else
        {
            observer.secondContactBelowHorizon = false;
        }
        
        if (this.getAlt(this.c3Circumstances) < 0.0)
        {
            observer.thirdContactBelowHorizon = true;
        }
        else
        {
            observer.thirdContactBelowHorizon = false;
        }
        
        if (this.midCircumstances.localType == 1)	// Just a partial event.
        {
            if (observer.fourthContactBelowHorizon && observer.midEclipseBelowHorizon && observer.firstContactBelowHorizon)	// Everything happens below horizon.
            {
                this.midCircumstances.localType = 0;
                return false;
            }
        }
        else
        {
            if (observer.fourthContactBelowHorizon &&
                    observer.midEclipseBelowHorizon &&
                    observer.firstContactBelowHorizon &&
                    observer.secondContactBelowHorizon &&
                    observer.thirdContactBelowHorizon
                    )	// Everything happens below horizon.
            {
                this.midCircumstances.localType = 0;
                return false;
            }
            
            if (observer.secondContactBelowHorizon &&
                    observer.thirdContactBelowHorizon
                    )	// Total or Annular phase happens below horizon, so its only a partial event then.
            {
                this.midCircumstances.localType = 1;
            }
        }
        
        return true;
    };
    
    // For a annular or total eclipse, has it gone past horizon?
    // Helper function for drawlines.
    // Returns true if below horizons,
    // Input: ObserverCircumstances
    // bSearchingEast = True if searching east.
    this.checkCentralHorizons = function(observer, bSearchingEast)
    {
        if (!observer.isVisible) 
        {
            return true;	// We're done searching.
        }
        if (observer.midEclipseBelowHorizon)
        {
            return true;
        }
        
        return false;
    };
    
    // For a partial eclipse, has it gone past horizon?
    // Helper function for drawlines.
    // Returns true if below horizons,
    // Input: ObserverCircumstances
    // bSearchingEast = True if searching east.
    this.checkPartialHorizons = function(observer, bSearchingEast)
    {
        if (observer.firstContactBelowHorizon && bSearchingEast)
        {
            return true;
        }
        
        if (observer.fourthContactBelowHorizon && !bSearchingEast)
        {
            return true;
        }
        
        return false;
    };
    
    // Draws central line of eclipse.
    // Produces an array of Position Objects to define central line.
    // Eclipse must be either a Total or Annular
    // Midpoint of eclipse must be defined.
    this.drawCentralLine = function()
    {
        if (this.centralLine != null)
        {
            return this.centralLine;	
        }
        
        if (this.type == "Annular" || this.type == "Total" || this.type == "Hybrid")	// TODO: Also need to make sure it's a central eclipse?
        {
            this.centralLine = [];
            this.centralLineTimes = [];
            
            this.centralLine.push(this.midEclipsePoint);
            
            var longitudeOffset = 0.5;
            var latitudeOffset = 0.5;
            var currentLongitude = 0.0;
            var currentLatitude = 0.0;
            var lastDepth = 0.0;
            var north = 1;
            var currentCircumstances = new ObserverCircumstances();
            var bBreakSearch = false;
            
            currentCircumstances = this.calculateLocalCircumstances(this.midEclipsePoint.latitude, this.midEclipsePoint.longitude, 0.0);
            this.centralLineTimes.push(currentCircumstances.circDates);
            
            // Search East and West
            for (var east = 1; east > -2; east -= 2)		// Go through longitudes east first (1), then west (-1)
            {
                bBreakSearch = false;
                
                longitudeOffset = Math.abs(longitudeOffset) * east;
                
                for (var currentLongOffset = longitudeOffset;
                        Math.abs(currentLongOffset) <= 180.0;
                        currentLongOffset += longitudeOffset)
                {
                    currentLongitude = incrementLong(this.midEclipsePoint.longitude, currentLongOffset);
                    
                    // First test.
                    if (currentLongOffset == longitudeOffset)
                    {
                        currentLatitude = this.midEclipsePoint.latitude;
                    }
                    
                    currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                    lastDepth = currentCircumstances.depth;
                    
                    if (this.checkCentralHorizons(currentCircumstances, (east == 1)) || bBreakSearch)
                    {
                        break;
                    }
                    
                    if (currentCircumstances.depth < 99.9)	// Not on or close to center line.
                    {
                        if (currentCircumstances.northOfCenter)
                        {
                            north = -1;  // Offset to search south
                        }
                        else
                        {
                            north = 1;	// Offset to search north.
                        }
                        latitudeOffset = Math.abs(latitudeOffset) * north;
                        
                        // Search North or South
                        for (currentLatitude += latitudeOffset;
                                Math.abs(currentLatitude) <= 90.0;
                                currentLatitude += latitudeOffset)
                        {
                            currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                            if (this.checkCentralHorizons(currentCircumstances, (east == 1)))
                            {
                                bBreakSearch = true;
                            }
                            if (currentCircumstances.depth < 99.9)	// Not on or close to center line.
                            {
                                if ((currentCircumstances.northOfCenter && north == 1) || (!currentCircumstances.northOfCenter && north == -1))	// Went past central line!
                                {
                                    currentLatitude -= latitudeOffset * ((100 - currentCircumstances.depth) / ((100 - lastDepth) + (100 - currentCircumstances.depth)));
                                    currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0); // Get again for line times.
                                    if (east == 1) // Keeps in order, westerly part of eclipse in the beginning of array.
                                    {
                                        this.centralLine.push(new Position(currentLatitude, currentLongitude));
                                        this.centralLineTimes.push(currentCircumstances.circDates);
                                    }
                                    else
                                    {
                                        this.centralLine.unshift(new Position(currentLatitude, currentLongitude));
                                        this.centralLineTimes.unshift(currentCircumstances.circDates);
                                    }
                                    break;
                                }
                                lastDepth = currentCircumstances.depth;
                            }
                            else
                            {
                                currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0); // Get again for line times.
                                
                                if (east == 1) // Keeps in order, westerly part of eclipse in the beginning of array.
                                {
                                    this.centralLine.push(new Position(currentLatitude, currentLongitude));
                                    this.centralLineTimes.unshift(currentCircumstances.circDates);
                                }
                                else
                                {
                                    this.centralLine.unshift(new Position(currentLatitude, currentLongitude));
                                    this.centralLineTimes.unshift(currentCircumstances.circDates);
                                }
                                break;
                            }
                        }
                    }
                    else	// We're close enough to center line.
                    {
                        currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0); // Get again for line times.
                        
                        if (east == 1) // Keeps in order, westerly part of eclipse in the beginning of array.
                        {
                            this.centralLine.push(new Position(currentLatitude, currentLongitude));
                            this.centralLineTimes.push(currentCircumstances.circDates);
                        }
                        else
                        {
                            this.centralLine.unshift(new Position(currentLatitude, currentLongitude));
                            this.centralLineTimes.unshift(currentCircumstances.circDates);
                        }
                    }
                }
            } // End East / West Loop.	
        }
        
        return this.centralLine;
    };
    
    // Returns date object with penumbra start time (on Earth).
    // Returns null if penumbra limit lines not yet drawn!
    // TODO:  Does not work yet!
    this.getPenumbraStartTime = function()
    {
        var penUmbraStartTime = null;
        
        if (this.westPenumbraLineTimes)
        {
            var lineTimes = [];
            lineTimes = lineTimes.concat(this.westPenumbraLineTimes);
            lineTimes = lineTimes.sort(function(time_a, time_b)
            {
                if(time_a.getMidDate() != null && time_b.getMidDate() != null)
                {
                     return(time_a.getMidDate().getTime() - time_b.getMidDate().getTime());
                }
                return 0;
            });
            
            penUmbraStartTime = new Date(lineTimes[0].getMidDate());
           
            penUmbraStartTime.setUTCMinutes(penUmbraStartTime.getUTCMinutes() - 45);	// TODO: Not using correct line times for end of eclipse, this will get us close enough for now.
        }
        
        return penUmbraStartTime;	
    };
    
    // Returns date object with penumbra end time (on Earth).
    // Returns null if penumbra limit lines not yet drawn!
    // TODO:  Does not work yet!
    this.getPenumbraEndTime = function()
    {
        var penUmbraEndTime = null;
        
        if (this.eastPenumbraLineTimes)
        {
            var lineTimes = [];
            lineTimes = lineTimes.concat(this.eastPenumbraLineTimes);
            lineTimes = lineTimes.sort(function(time_a, time_b)
            {
                if(time_b.getMidDate() != null && time_a.getMidDate() != null )
                {
                    return(time_b.getMidDate().getTime() - time_a.getMidDate().getTime());
                }
                return 0;
            });
            
            penUmbraEndTime = new Date(lineTimes[0].getMidDate());
                        
            penUmbraEndTime.setUTCMinutes(penUmbraEndTime.getUTCMinutes() + 45);	// TODO: Not using correct line times for end of eclipse, this will get us close enough for now.
        }
        
        return penUmbraEndTime;	
    };
    
    // Returns date object with umbra start time (on Earth).
    // Returns null if no umbra, or umbra lines not yet drawn!
    this.getUmbraStartTime = function()
    {
        var umbraStartTime = null;
        
        if (this.centralLineTimes)
        {
            umbraStartTime = new Date(this.centralLineTimes[0].getC2Date());
        }
        else
        {
            if (this.northUmbraLineTimes)
            {
                umbraStartTime = new Date(this.northUmbraLineTimes[0].getMidDate());
            }
            
            if (this.southUmbraLineTimes)
            {
                umbraStartTime = new Date(this.southUmbraLineTimes[0].getMidDate());
            }
        }
        
        if (umbraStartTime)
        {
            umbraStartTime.setMinutes(umbraStartTime.getMinutes() - 1); // Doing this for rounding issues?  TODO: Fix for accuracy.
        }
        
        return umbraStartTime;
    };
    
    // Returns date object with umbra end time.
    // Returns null if no umbra, or umbra lines not yet drawn!
    this.getUmbraEndTime = function()
    {
        var umbraEndTime = null;
        
        if (this.centralLineTimes)
        {
            umbraEndTime = new Date(this.centralLineTimes[this.centralLineTimes.length - 1].getC3Date());	
        }
        else
        {
            if (this.northUmbraLineTimes)
            {
                umbraEndTime = new Date(this.northUmbraLineTimes[this.northUmbraLineTimes.length - 1].getMidDate());
            }
            
            if (this.southUmbraLineTimes)
            {
                umbraEndTime = new Date(this.southUmbraLineTimes[this.northUmbraLineTimes.length - 1].getMidDate());
            }	
        }
        
        if (umbraEndTime)
        {
            umbraEndTime.setMinutes(umbraEndTime.getMinutes() + 1);	// Doing this for rounding issues?  TODO: Fix for accuracy.
        }
        
        return umbraEndTime;
    };
    
    // Draws southern limit of (ant)umbral line of eclipse.
    // Produces an array of Position Objects to define the line.
    // Eclipse must be either a Total or Annular
    // Midpoint of eclipse must be defined.
    // Input bNorth: required Boolean, true: Northern Umbral Limit, false: southern umbral limit.
    this.drawUmbraLimit = function(bNorth)
    {
        if (!bNorth && this.southUmbraLine)
        {
            return this.southUmbraLine;	
        }
        
        if (bNorth && this.northUmbraLine)
        {
            return this.northUmbraLine;
        }
        
        var umbraLimit = null;
        var lineTimes = null;
        
        if (this.type == "Annular" || this.type == "Total" || this.type == "Hybrid")	// TODO: If it is not a central eclipse we can only draw one side of the umbral limit line?
        {
            umbraLimit = [];
            lineTimes = [];
            
            var longitudeOffset = 0.5;
            var latitudeOffset = 0.5;
            var currentLongitude = this.midEclipsePoint.longitude;
            var currentLatitude = this.midEclipsePoint.latitude;
            var lastDepth = 100.0;	// Last depth was the midpoint, a known value of 100.0
            var north = 1;	// Change for northern or southern limits
            var currentCircumstances = new ObserverCircumstances();
            var bBreakSearch = false;
            
            if (!bNorth)	// Initial search, false go south, true: go north.
            {
                north = -1;
            }
            
            // Search East and West
            for (var east = 1; east >= -1; east -= 2)		// Go through longitudes east first (1), then west (-1)
            {
                currentCircumstances = new ObserverCircumstances();
                lastDepth = 100.0;
                longitudeOffset = Math.abs(longitudeOffset) * east;
                currentLongitude = this.midEclipsePoint.longitude;
                currentLatitude = this.midEclipsePoint.latitude;
                bBreakSearch = false;
                
                for (var currentLongOffset = 0.0;
                        Math.abs(currentLongOffset) <= 180.0;
                        currentLongOffset += longitudeOffset)
                {
                    if (east == -1)	// if going the other way, skip over one, since we already have the midpoint.
                    {
                        currentLongOffset += longitudeOffset;
                        currentLatitude = umbraLimit[0].latitude;
                    }
                    
                    currentLongitude = incrementLong(this.midEclipsePoint.longitude, currentLongOffset);
                    
                    if (currentLongOffset > 0 || east == -1)	// Not first iteration
                    {
                        currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                        lastDepth = currentCircumstances.depth;
                        
                        if (this.checkCentralHorizons(currentCircumstances, (east == 1)) || bBreakSearch)
                        {
                            break;
                        }
                        
                        if (lastDepth <= 0.0 && currentCircumstances.northOfCenter)	// Went past umbral limit, flip the search.
                        {
                            north = -1;
                        }
                        else if (lastDepth > 0.0 && currentCircumstances.northOfCenter)
                        {
                            north = 1;
                        }
                        else if (lastDepth > 0.0 && !currentCircumstances.northOfCenter)
                        {
                            north = -1;
                        }
                        else if (lastDepth <= 0.0 && !currentCircumstances.northOfCenter)
                        {
                            north = 1;
                        }
                    }
                    
                    latitudeOffset = Math.abs(latitudeOffset) * north;
                    
                    // Search North or South
                    for (currentLatitude += latitudeOffset;
                            Math.abs(currentLatitude) <= 90.0;
                            currentLatitude += latitudeOffset)
                    {
                        currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                        if (this.checkCentralHorizons(currentCircumstances, (east == 1)))
                        {
                            bBreakSearch = true;
                        }
                        if (currentCircumstances.depth > 0.1 || currentCircumstances.depth < -0.1)	// Not on or close to center line.
                        {
                            if ((currentCircumstances.depth < 0.0 && lastDepth > 0.0) || (currentCircumstances.depth > 0.0 && lastDepth < 0.0))	// Went past umbral limit central line!
                            {
                                currentLatitude -= latitudeOffset * (Math.abs(currentCircumstances.depth) / (Math.abs(lastDepth) + Math.abs(currentCircumstances.depth)));
                                currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0); // Get again for line times.
                                
                                if (east == 1) // Keeps in order, westerly part of eclipse in the beginning of array.
                                {
                                    umbraLimit.push(new Position(currentLatitude, currentLongitude));
                                    lineTimes.push(currentCircumstances.circDates);
                                }
                                else
                                {
                                    umbraLimit.unshift(new Position(currentLatitude, currentLongitude));
                                    lineTimes.unshift(currentCircumstances.circDates);
                                }
                                
                                break;
                            }
                            lastDepth = currentCircumstances.depth;
                        }
                        else
                        {
                            currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0); // Get again for line times.
                            
                            if (east == 1) // Keeps in order, westerly part of eclipse in the beginning of array.
                            {
                                umbraLimit.push(new Position(currentLatitude, currentLongitude));
                                lineTimes.push(currentCircumstances.circDates);
                            }
                            else
                            {
                                umbraLimit.unshift(new Position(currentLatitude, currentLongitude));
                                lineTimes.unshift(currentCircumstances.circDates);
                            }
                            
                            break;
                        }
                    }	
                }
            } // End East / West Loop.	
        }
        
        if (lineTimes)
        {
            if (lineTimes.length > 0)
            {
                if (bNorth)
                {
                    this.northUmbraLineTimes = [];
                    this.northUmbraLineTimes = this.northUmbraLineTimes.concat(lineTimes);
                }
                else
                {
                    this.southUmbraLineTimes = [];
                    this.southUmbraLineTimes = this.southUmbraLineTimes.concat(lineTimes);
                }
            }
        }
        
        if (umbraLimit)
        {
            if (umbraLimit.length > 0)
            {
                if (bNorth)
                {
                    this.northUmbraLine = [];
                    this.northUmbraLine = this.northUmbraLine.concat(umbraLimit);
                    return this.northUmbraLine;
                }
                
                this.southUmbraLine = [];
                this.southUmbraLine = this.southUmbraLine.concat(umbraLimit);
                return this.southUmbraLine;	
            }
        }
        
        return this.northUmbraLine;
    };
    
    // Draws the penumbral limits of the eclipse
    // Set bNorth to false, to get southern limits
    // Set bNorth to true to to get northern limits.
    // Returns an array of Positions to describe the line
    // Returns an empty array on no positions or failure.
    this.drawPenumbralLimit = function(bNorth)
    {
        if (bNorth && this.northPenumbralLine)
        {
            return this.northPenumbraLine;
        }
        if (!bNorth && this.southPenumbraLine)
        {
            return this.southPenumbraLine;
        }
        
        var penUmbrallLimit = [];
        
        var longitudeOffset = 0.5;
        var latitudeOffset = 0.5;
        var currentLongitude = this.midEclipsePoint.longitude;
        var currentLatitude = this.midEclipsePoint.latitude;
        var lastMagnitude = 100.0;
        var north = 1;
        var currentCircumstances = new ObserverCircumstances();
        var bBreakSearch = false;
        var initialLimitNotFound = true;
        
        // TODO: If only partial or non-central eclipse, only one line should be obtained??
        
        // Search East and West
        for (var east = 1; east > -2; east -= 2)		// Go through longitudes east first (1), then west (-1)
        {
            bBreakSearch = false;
            
            longitudeOffset = Math.abs(longitudeOffset) * east;
            
            if (!bNorth)	// Initial search, false go south, true: go north.
            {
                north = -1;
            }
            latitudeOffset = Math.abs(latitudeOffset) * north;
            
            if (east == 1)	// First search, big jump north or south to find first limit point.
            {
                latitudeOffset = 2.0 * north;	// Bigger jump, will set down later for normal search.
                // Search North or South
                for (currentLatitude += latitudeOffset;
                        Math.abs(currentLatitude) <= 90.0;
                        currentLatitude += latitudeOffset)
                {
                    currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                    if (currentCircumstances.magnitude > 0.0)	// Haven't crossed limit yet.
                    {
                        lastMagnitude = currentCircumstances.magnitude;
                    }
                    else	// Crossed limit.
                    {
                        currentLatitude -= latitudeOffset * (Math.abs(currentCircumstances.magnitude)) / (Math.abs(lastMagnitude) + Math.abs(currentCircumstances.magnitude));
                        penUmbrallLimit.push(new Position(currentLatitude, currentLongitude));
                        initialLimitNotFound = false;
                        break;	// Found first limit point, get out of "fast" search
                    }
                }
                
                if (initialLimitNotFound)	// Limit at the poles, add a polar limit???
                {
                    break;	// There is no limit in this direction!
                }
            }
            else	// Second search, just use first valid coordinates from first search.
            {
                currentLatitude = penUmbrallLimit[0].latitude;
                currentLongitude = penUmbrallLimit[0].longitude;
            }
            
            latitudeOffset = 0.5 * north;	// Back to normal search offset.
            
            for (var currentLongOffset = longitudeOffset;
                    Math.abs(currentLongOffset) <= 180.0;
                    currentLongOffset += longitudeOffset)
            {
                currentLongitude = incrementLong(penUmbrallLimit[0].longitude, currentLongOffset);
                
                currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                lastMagnitude = currentCircumstances.magnitude;
                
                if (this.checkPartialHorizons(currentCircumstances, (east == 1)) || bBreakSearch)
                {
                    break;
                }
                
                if (currentCircumstances.northOfCenter && lastMagnitude < 0.0)
                {
                    north = -1;  // Offset to search south
                }
                else if (!currentCircumstances.northOfCenter && lastMagnitude < 0.0)
                {
                    north = 1;	// Offset to search north.
                }
                else if (!currentCircumstances.northOfCenter && lastMagnitude > 0.0)
                {
                    north = -1;	// Offset to search south.
                }
                else if (currentCircumstances.northOfCenter && lastMagnitude > 0.0)
                {
                    north = 1;	// Offset to search north.
                }
                
                latitudeOffset = Math.abs(latitudeOffset) * north;
                
                initialLimitNotFound = true;		
                // Search North or South
                for (currentLatitude += latitudeOffset;
                        Math.abs(currentLatitude) <= 90.0;
                        currentLatitude += latitudeOffset)
                {
                    currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                    if (this.checkPartialHorizons(currentCircumstances, (east == 1)))
                    {
                        bBreakSearch = true;
                    }
                    
                    if ((lastMagnitude > 0.0 && currentCircumstances.magnitude < 0.0) || (lastMagnitude < 0.0 && currentCircumstances.magnitude > 0.0))	// Went past penumbral limit line!
                    {
                        currentLatitude -= latitudeOffset * (Math.abs(currentCircumstances.magnitude)) / (Math.abs(lastMagnitude) + Math.abs(currentCircumstances.magnitude));
                        initialLimitNotFound = false;
                        
                        if (east == 1) // Keeps in order, westerly part of eclipse in the beginning of array.
                        {
                            penUmbrallLimit.push(new Position(currentLatitude, currentLongitude));
                        }
                        else
                        {
                            penUmbrallLimit.unshift(new Position(currentLatitude, currentLongitude));
                        }
                        break;
                    }
                    
                    lastMagnitude = currentCircumstances.magnitude;
                }
                
                if (initialLimitNotFound)	// Limit at the poles, add a polar limit???
                {
                    // TODO: ??
                }
            }
        }
        
        if (penUmbrallLimit.length < 1)
        {
            penUmbrallLimit = null;
        }
        
        if (bNorth)
        {
            if(penUmbrallLimit)
            {
                this.northPenumbraLine = penUmbrallLimit.slice(1, penUmbrallLimit.length - 1);  // Delete first and last plot points for smooth join to east/west limits
                // TODO: Probably a better more exact way of doing this?
            }
            return this.northPenumbraLine;
        }
        
        if(penUmbrallLimit)
        {
            this.southPenumbraLine = penUmbrallLimit.slice(1, penUmbrallLimit.length - 1);  // Delete first and last plot points for smooth join to east/west limits
        }
        
        return this.southPenumbraLine;
    };
    
    // Draws east / west limits of eclipse
    // Penumbral limits must be drawn first!
    // if (bWest = true), westerly limit is drawn, else, easterly limit.
    // Returns null upon failure or no limits?
    this.drawEastWestLimit = function(bWest)
    {
        if (bWest && this.westLimitLine)
        {
            return this.westLimitLine;
        }
        if (!bWest && this.eastLimitLine)
        {
            return this.eastLimitLine;
        }
        
        if (!this.southPenumbraLine && !this.northPenumbraLine)
        {
            console.log("Can't draw east or west limit line without the north and south penumbral limits.");
            return null;
        }
        
        var latOffset = 0.5;
        var longOffset = 0.5;
        
        var limitLine = [];
        var bNorth = true; // Start search from south to north.
        var latLimit = 90.0;
        var westLongLimit = 0.0;
        var eastLongLimit = 0.0;
        var currentAlt = 0.0;
        var lastAlt = 0.0;
        var currentLatitude = 0.0;
        var currentLongitude = 0.0;
        var lastLongitude = 0.0;
        var totalLatOffset = 0.0;
        var maxLatOffset = 0.0;
        var totalLongOffset = 0.0;
        var maxLongOffset = 0.0;
        var deltaLong = 0.0;
        var currentCircumstances = new ObserverCircumstances();
        var lineTimes = [];
        
        if (!this.southPenumbraLine && this.northPenumbraLine)
        {
            bNorth = false;
            latLimit = -90.0;
            
            if (!bWest)
            {
                limitLine.push(this.northPenumbraLine[this.northPenumbraLine.length - 1]);	// Start with the end of penumbra limit.
                currentCircumstances = this.calculateLocalCircumstances(this.northPenumbraLine[this.northPenumbraLine.length - 1].latitude, this.northPenumbraLine[this.northPenumbraLine.length - 1].longitude, 0.0);
                lineTimes.push(currentCircumstances.circDates);
            }
            else
            {
                limitLine.push(this.northPenumbraLine[0]);
                currentCircumstances = this.calculateLocalCircumstances(this.northPenumbraLine[0].latitude, this.northPenumbraLine[0].longitude, 0.0);
                lineTimes.push(currentCircumstances.circDates);
            }
        }
        else
        {
            if (!bWest)
            {
                limitLine.push(this.southPenumbraLine[this.southPenumbraLine.length - 1]);	// Start with the end of penumbra limit.
                currentCircumstances = this.calculateLocalCircumstances(this.southPenumbraLine[this.southPenumbraLine.length - 1].latitude, this.southPenumbraLine[this.southPenumbraLine.length - 1].longitude, 0.0);
                lineTimes.push(currentCircumstances.circDates);
            }
            else
            {
                limitLine.push(this.southPenumbraLine[0]);
                currentCircumstances = this.calculateLocalCircumstances(this.southPenumbraLine[0].latitude, this.southPenumbraLine[0].longitude, 0.0);
                lineTimes.push(currentCircumstances.circDates);
            }
        }
        
        if (bWest)
        {
            eastLongLimit = this.midEclipsePoint.longitude;
            westLongLimit = incrementLong(limitLine[0].longitude, 90.0);
        }
        else
        {
            westLongLimit = this.midEclipsePoint.longitude;
            eastLongLimit = incrementLong(limitLine[0].longitude, 90.0);
        }
        
        /**** This should be taken care of with long limits?
         if(this.type == "Partial")	
         {
         latLimit = this.midEclipsePoint.latitude;
         }
         ****/
        
        if (this.type == "Annular" || this.type == "Total" || this.type == "Hybrid")	
        {
            if (bNorth)
            {
                if (this.northPenumbraLine)
                {
                    if (bWest)
                    {
                        latLimit = this.northPenumbraLine[0].latitude;
                    }
                    else
                    {
                        latLimit = this.northPenumbraLine[this.northPenumbraLine.length - 1].latitude;
                    }
                }
                else
                {
                    latLimit = 90.0;
                }
            }
            else
            {
                if (this.southPenumbraLine)
                {
                    if (bWest)
                    {
                        latLimit = this.southPenumbraLine[0].latitude;
                    }
                    else
                    {
                        latLimit = this.southPenumbraLine[this.southPenumbraLine.length - 1].latitude;
                    }
                }
                else
                {
                    latLimit = -90.0;
                }
            }
        }
        
        if (!bNorth)
        {
            latOffset *= -1.0;
        }
        
        currentLatitude = limitLine[0].latitude;
        currentLongitude = limitLine[0].longitude;
        maxLatOffset = Math.abs(latLimit - currentLatitude);
        
        for (totalLatOffset += (latOffset * 2);
             Math.abs(totalLatOffset) < maxLatOffset;
             totalLatOffset += latOffset)
        {
            currentLatitude = limitLine[0].latitude + totalLatOffset;
            currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
            
            if (bWest)
            {
                currentAlt = currentCircumstances.c4Altitude;
                
                if (currentAlt > 0.0)	// Above horizon on westerly limit, search west.
                {
                    longOffset = Math.abs(longOffset) * (-1);
                    maxLongOffset = Math.abs(currentLongitude - westLongLimit);
                }
                else
                {
                    longOffset = Math.abs(longOffset);
                    maxLongOffset = Math.abs(currentLongitude - eastLongLimit);
                }
            }
            else
            {
                currentAlt = currentCircumstances.c1Altitude;
                if (currentAlt < 0.0)	// Below horizon on westerly limit, search west.
                {
                    longOffset = Math.abs(longOffset) * (-1);
                    maxLongOffset = Math.abs(currentLongitude - westLongLimit);
                }
                else
                {
                    longOffset = Math.abs(longOffset);
                    maxLongOffset = Math.abs(currentLongitude - eastLongLimit);
                }
            }
            
            if (maxLongOffset > 180.0)
            {
                maxLongOffset -= 180.0;
            }
            
            lastAlt = currentAlt;
            totalLongOffset = 0.0;
            lastLongitude = currentLongitude;
            for (totalLongOffset += longOffset;
                    Math.abs(totalLongOffset) <= Math.abs(maxLongOffset);
                    totalLongOffset += longOffset
                    )
            {
                currentLongitude = incrementLong(lastLongitude, totalLongOffset);
                
                currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                
                if (bWest)
                {
                    currentAlt = currentCircumstances.c4Altitude;
                }
                else
                {
                    currentAlt = currentCircumstances.c1Altitude;
                }
                if(isNaN(currentAlt))   // If this fails, mid will be close enough
                {
                    currentAlt = currentCircumstances.midAltitude;
                }
                
                if(isNaN(currentAlt))   // If it is still bad, get out!
                {
                    break;
                }
                if ((currentAlt < 0.0 && lastAlt > 0.0) || (currentAlt > 0.0 && lastAlt < 0.0))	// Crossed the horizon
                {
                    deltaLong = (-1.0) * (longOffset * Math.abs(currentAlt) / (Math.abs(currentAlt) + Math.abs(lastAlt)));
                    currentLongitude = incrementLong(currentLongitude, deltaLong);
                    
                    limitLine.push(new Position(currentLatitude, currentLongitude));
                    currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                    lineTimes.push(currentCircumstances.circDates);
                    
                    break;
                }
                else
                {
                    lastAlt = currentAlt;
                    // Continue searching.
                }
            }
            if (Math.abs(totalLongOffset) >= Math.abs(maxLongOffset))	// Searched as far east or west as we should go, so get it out.
            {
                break;
            }
        }
             
       if(!bNorth)   // Join up with other penumbra line. TODO: DOESNT WORK YET????
       {
            if (!bWest && this.southPenumbraLine)
            {
                limitLine.push(this.southPenumbraLine[this.southPenumbraLine.length - 1]);	// Start with the end of penumbra limit.
                currentCircumstances = this.calculateLocalCircumstances(limitLine[limitLine.length - 1].latitude, limitLine[limitLine.length - 1].longitude, 0.0);
                lineTimes.push(currentCircumstances.circDates);
            }
            else if(this.southPenumbraLine)
            {
                limitLine.push(this.southPenumbraLine[0]);
                currentCircumstances = this.calculateLocalCircumstances(limitLine[limitLine.length - 1].latitude, limitLine[limitLine.length - 1].longitude, 0.0);
                lineTimes.push(currentCircumstances.circDates);
            }
            else if(bWest && this.eastLimitLine)
            {
                limitLine.push(this.eastLimitLine[this.eastLimitLine.length - 1]);
                currentCircumstances = this.calculateLocalCircumstances(limitLine[limitLine.length - 1].latitude, limitLine[limitLine.length - 1].longitude, 0.0);
                lineTimes.push(currentCircumstances.circDates);
            }
        }
        else
        {
            if (!bWest && this.northPenumbraLine)
            {
                limitLine.push(this.northPenumbraLine[this.northPenumbraLine.length - 1]);	// Start with the end of penumbra limit.
                currentCircumstances = this.calculateLocalCircumstances(limitLine[limitLine.length - 1].latitude, limitLine[limitLine.length - 1].longitude, 0.0);
                lineTimes.push(currentCircumstances.circDates);
            }
            else if(this.northPenumbraLine)
            {
                limitLine.push(this.northPenumbraLine[0]);
                currentCircumstances = this.calculateLocalCircumstances(limitLine[limitLine.length - 1].latitude, limitLine[limitLine.length - 1].longitude, 0.0);
                lineTimes.push(currentCircumstances.circDates);
            }
            else if(bWest && this.eastLimitLine)
            {
                limitLine.push(this.eastLimitLine[this.eastLimitLine.length - 1]);
                currentCircumstances = this.calculateLocalCircumstances(limitLine[limitLine.length - 1].latitude, limitLine[limitLine.length - 1].longitude, 0.0);
                lineTimes.push(currentCircumstances.circDates);
            }
        }
        
        if (bWest)
        {
            this.westLimitLine = [];
            this.westLimitLine = this.westLimitLine.concat(limitLine);
            this.westPenumbraLineTimes = [];
            this.westPenumbraLineTimes = this.westPenumbraLineTimes.concat(lineTimes);
            return this.westLimitLine;
        }
        
        this.eastPenumbraLineTimes = [];
        this.eastPenumbraLineTimes = this.eastPenumbraLineTimes.concat(lineTimes);
        
        this.eastLimitLine = [];
        this.eastLimitLine = this.eastLimitLine.concat(limitLine);
        
        return this.eastLimitLine;
    };
    
    /*
     * Helper function to draw penumbra shadow.
     * Returns lat/long limits of penumbra shadow locations based limit lines.
     * Penumbra lines must be drawn first!
     * Returns null upon failure, invalid date, etc.
     */
    this.getPenumbraLimits = function()
    {
        var limits = null;
        
        if (this.eastLimitLine && this.westLimitLine && (this.northPenumbraLine || this.southPenumbraLine))
        {
            var northLimit = this.midEclipsePoint.latitude;
            var southLimit = this.midEclipsePoint.latitude;
            var westLimit = this.midEclipsePoint.longitude;
            var eastLimit = this.midEclipsePoint.longitude;
            var midLong = this.midEclipsePoint.longitude;
            
            limits = new PositionLimits();
            
            // Maximum north will be at the ends of one of the east/west limit lines.
            if (this.eastLimitLine[0].latitude > northLimit)
            {
                northLimit = this.eastLimitLine[0].latitude;
            }
            if (this.eastLimitLine[this.eastLimitLine.length - 1].latitude > northLimit)
            {
                northLimit = this.eastLimitLine[this.eastLimitLine.length - 1].latitude;
            }
            if (this.westLimitLine[0].latitude > northLimit)
            {
                northLimit = this.westLimitLine[0].latitude;
            }
            if (this.westLimitLine[this.westLimitLine.length - 1].latitude > northLimit)
            {
                northLimit = this.westLimitLine[this.westLimitLine.length - 1].latitude;
            }
            
            if (this.northPenumbraLine)	// If a higher value along north limit line exist, get it.
            {
                for (var i = 0; i < this.northPenumbraLine.length; i++)
                {
                    if (this.northPenumbraLine[i].latitude > northLimit)
                    {
                        northLimit = this.northPenumbraLine[i].latitude;
                    }
                }
                
                // East/West limits may also be at the ends of the north and south penumbra limit lines.
                if(isWest(westLimit, this.northPenumbraLine[0].longitude))
                {
                    if(isWest(midLong, this.northPenumbraLine[0].longitude))
                    {
                        westLimit = this.northPenumbraLine[0].longitude;
                    }
                }
                
                if(isWest(westLimit, this.northPenumbraLine[this.northPenumbraLine.length - 1].longitude))
                {
                    if(isWest(midLong, this.northPenumbraLine[this.northPenumbraLine.length - 1].longitude))
                    {
                        westLimit = this.northPenumbraLine[this.northPenumbraLine.length - 1].longitude;
                    }
                }
                
                if(isEast(eastLimit, this.northPenumbraLine[0].longitude))
                {
                    if(isEast(midLong, this.northPenumbraLine[0].longitude))
                    {
                        eastLimit = this.northPenumbraLine[0].longitude;
                    }
                }
                
                if(isEast(eastLimit, this.northPenumbraLine[this.northPenumbraLine.length - 1].longitude))
                {
                    if(isEast(midLong, this.northPenumbraLine[this.northPenumbraLine.length - 1].longitude))
                    {
                        eastLimit = this.northPenumbraLine[this.northPenumbraLine.length - 1].longitude;
                    }
                }
            }
            northLimit += 1.0;
            if (northLimit > 90.0)
            {
                northLimit = 90.0;
            }
            limits.setNorthLimit(northLimit);
            
            // Minimum south will be at the ends of one of the east/west limit lines.
            if (this.eastLimitLine[0].latitude < southLimit)
            {
                southLimit = this.eastLimitLine[0].latitude;
            }
            if (this.eastLimitLine[this.eastLimitLine.length - 1].latitude < southLimit)
            {
                southLimit = this.eastLimitLine[this.eastLimitLine.length - 1].latitude;
            }
            if (this.westLimitLine[0].latitude < southLimit)
            {
                southLimit = this.westLimitLine[0].latitude;
            }
            if (this.westLimitLine[this.westLimitLine.length - 1].latitude < southLimit)
            {
                southLimit = this.westLimitLine[this.westLimitLine.length - 1].latitude;
            }
            
            if (this.southPenumbraLine)	// If a lower value along south limit line exist, get it.
            {
                for (var i = 0; i < this.southPenumbraLine.length; i++)
                {
                    if (this.southPenumbraLine[i].latitude < southLimit)
                    {
                        southLimit = this.southPenumbraLine[i].latitude;
                    }
                }
                
                if(isWest(westLimit, this.southPenumbraLine[0].longitude))
                {
                    if(isWest(midLong, this.southPenumbraLine[0].longitudev ))
                    {
                        westLimit = this.southPenumbraLine[0].longitude;
                    }
                }
                
                if(isWest(westLimit, this.southPenumbraLine[this.southPenumbraLine.length - 1].longitude))
                {
                    if(isWest(midLong, this.southPenumbraLine[this.southPenumbraLine.length - 1].longitude))
                    {
                        westLimit = this.southPenumbraLine[this.southPenumbraLine.length - 1].longitude;
                    }
                }
                
                if(isEast(eastLimit, this.southPenumbraLine[0].longitude))
                {
                    if(isEast(midLong, this.southPenumbraLine[0].longitude))
                    {
                        eastLimit = this.southPenumbraLine[0].longitude;
                    }
                }
                
                if(isEast(eastLimit, this.southPenumbraLine[this.southPenumbraLine.length - 1].longitude))
                {
                    if(isEast(midLong, this.southPenumbraLine[this.southPenumbraLine.length - 1].longitude ))
                    {
                        eastLimit = this.southPenumbraLine[this.southPenumbraLine.length - 1].longitude;
                    }
                }
            }
            southLimit -= 1.0;
            if (southLimit < -90.0)
            {
                southLimit = -90.0;
            }
            limits.setSouthLimit(southLimit);
            
            // Since the east and west lines can be connected, don't read the last value.
            for (var i = 0; i < (this.westLimitLine.length - 1); i++)
            {
                if (isWest(westLimit, this.westLimitLine[i].longitude))
                {
                    if(isWest(midLong, this.westLimitLine[i].longitude))
                    {
                        westLimit = this.westLimitLine[i].longitude;
                    }
                }
            }
            westLimit = incrementLong(westLimit, -1.0);
            
            limits.setWestLimit(westLimit);
            
            for (var i = 0; i < (this.eastLimitLine.length - 1); i++)
            {
                if (isEast(eastLimit, this.eastLimitLine[i].longitude))
                {
                    if(isEast(midLong, this.eastLimitLine[i].longitude))
                    {
                        eastLimit = this.eastLimitLine[i].longitude;
                    }
                }
            }
            eastLimit = incrementLong(eastLimit, 1.0); // Round up to make sure we capture everything, not sure if we really need to do this.
            
            limits.setEastLimit(eastLimit);
        }
        
        return limits;
    };
    
    /*
     * Helper function to draw umbra shadow.
     * Returns lat/long limits of umbra shadow locations based upon time.
     * Umbra lines must be drawn first!
     * Input date object required.
     * Returns null upon failure, invalid date, etc.
     */
    this.getUmbraLimits = function(/* Date */ time)
    {
        var limits = null;
        
        if (this.northUmbraLineTimes || this.southUmbraLineTimes)	// Have to have at least one side of umbra path defined.
        {
            limits = new PositionLimits();
            
            var eastLimit = null;
            var westLimit = null;
            var lineTime = null;
            var bFirstTimeFound = false;
            var bLastTimeFound = false;
            var centralTimeSpan = 0;
            var eclipseStats = null;
            
            // Find time span of umbra at specific time along path.
            if (this.centralLineTimes)
            {
                for (var i = 0; i < this.centralLineTimes.length; i++)
                {
                    lineTime = this.centralLineTimes[i].getMidDate();
                    if (lineTime)
                    {
                        if (lineTime >= time.getTime())
                        {
                            eclipseStats = this.calculateLocalCircumstances(this.centralLine[i].latitude, this.centralLine[i].longitude, 0.0);
                            centralTimeSpan = eclipseStats.c2c3TimeSpan.getRawMilliSeconds();
                            break;
                        }
                    }
                }
                
                // If unable to retrieve time for requested coordinate, use max time.
                if(centralTimeSpan == 0)
                {
                    this.midEclipsePoint.latitude
                    eclipseStats = this.calculateLocalCircumstances(this.midEclipsePoint.latitude, this.midEclipsePoint.longitude, 0.0);
                    centralTimeSpan = eclipseStats.c2c3TimeSpan.getRawMilliSeconds();
                }
            }
            
            // If still unable, use theoretical maximum length of an annular eclipse.
            if (centralTimeSpan == 0)
            {
                centralTimeSpan = MAX_LENGTH_TIME_CENTRAL_ECLIPSE;
            }
                
            var firstSearchTime = time.getTime() - Math.round((centralTimeSpan / 2));
            var lastSearchTime = time.getTime() + Math.round((centralTimeSpan / 2));
            
            if (this.northUmbraLineTimes)
            {
                var northLimit = -90.0;
                
                for (var i = 0; i < this.northUmbraLineTimes.length; i++)
                {
                    lineTime = this.northUmbraLineTimes[i].getMidDate();
                    
                    if (lineTime)
                    {
                        // Look back half max annular time before mid eclipse at limit line.
                        if ((lineTime.getTime() >= firstSearchTime) && !bFirstTimeFound)
                        {
                           bFirstTimeFound = true; 
                            if (eastLimit == null)
                            {
                                eastLimit = this.northUmbraLine[i].longitude;
                            }
                            else if (isEast(eastLimit, this.northUmbraLine[i].longitude))
                            {
                                eastLimit = this.northUmbraLine[i].longitude;
                            }
                            if (northLimit < this.northUmbraLine[i].latitude)
                            {
                                northLimit = this.northUmbraLine[i].latitude;
                            }
                            if (i > 0)
                            {
                                if (westLimit == null)
                                {
                                    westLimit = this.northUmbraLine[i - 1].longitude;
                                }
                                else if (isWest(westLimit, this.northUmbraLine[i - 1].longitude))
                                {
                                    westLimit = this.northUmbraLine[i - 1].longitude;
                                }
                                if (northLimit < this.northUmbraLine[i - 1].latitude)
                                {
                                    northLimit = this.northUmbraLine[i - 1].latitude;
                                }
                            }
                            
                            continue;
                        }
                        // Look forward half max annular time before mid eclipse at limit line.
                        if (lineTime.getTime() >= lastSearchTime)
                        {
                            if (eastLimit == null)
                            {
                                eastLimit = this.northUmbraLine[i].longitude;
                            }
                            else if (isEast(eastLimit, this.northUmbraLine[i].longitude))
                            {
                                eastLimit = this.northUmbraLine[i].longitude;
                            }
                            if (northLimit < this.northUmbraLine[i].latitude)
                            {
                                northLimit = this.northUmbraLine[i].latitude;
                            }
                            if (i > 0)
                            {
                                if (westLimit == null)
                                {
                                    westLimit = this.northUmbraLine[i - 1].longitude;
                                }
                                else if (isWest(westLimit, this.northUmbraLine[i - 1].longitude))
                                {
                                    westLimit = this.northUmbraLine[i - 1].longitude;
                                }
                                if (northLimit < this.northUmbraLine[i - 1].latitude)
                                {
                                    northLimit = this.northUmbraLine[i - 1].latitude;
                                }
                            }
                            
                            bLastTimeFound = true;
                            break;
                        }
                    }
                }
                
                if (bFirstTimeFound && !bLastTimeFound) // The eclipse should be still occurring use the end of the limit line.
                {
                    i--;
                    if(i > 0)
                    {
                        if (eastLimit == null)
                        {
                            eastLimit = this.northUmbraLine[i].longitude;
                        }
                        else if (isEast(eastLimit, this.northUmbraLine[i].longitude))
                        {
                            eastLimit = this.northUmbraLine[i].longitude;
                        }
                        if (northLimit < this.northUmbraLine[i].latitude)
                        {
                            northLimit = this.northUmbraLine[i].latitude;
                        }
                        if (i > 0)
                        {
                            if (westLimit == null)
                            {
                                westLimit = this.northUmbraLine[i - 1].longitude;
                            }
                            else if (isWest(westLimit, this.northUmbraLine[i - 1].longitude))
                            {
                                westLimit = this.northUmbraLine[i - 1].longitude;
                            }
                            if (northLimit < this.northUmbraLine[i - 1].latitude)
                            {
                                northLimit = this.northUmbraLine[i - 1].latitude;
                            }
                        }
                    }
                }

                
                if (northLimit == -90.0)	// Invalid time used.
                {
                    return null;
                }
                
                northLimit = incrementLat(northLimit, 0.05);	// Round up, just to make sure we capture everything.  Not sure if necessary?
                
                limits.setNorthLimit(northLimit);
            }
            else
            {
                limits.setNorthLimit(90.0);
            }
            
            if (this.southUmbraLineTimes)
            {
                var southLimit = 90.0;
                bFirstTimeFound = false;
                bLastTimeFound = false;
                
                for (var i = 0; i < this.southUmbraLineTimes.length; i++)
                {
                    lineTime = this.southUmbraLineTimes[i].getMidDate();
                    
                    if (lineTime)
                    {
                        // Look back half max annular time before mid eclipse at limit line.
                        if ((lineTime.getTime() >= firstSearchTime) && !bFirstTimeFound)
                        {
                            bFirstTimeFound = true;
                            if (eastLimit == null)
                            {
                                eastLimit = this.southUmbraLine[i].longitude;
                            }
                            else
                            {
                                if (isEast(eastLimit, this.southUmbraLine[i].longitude))
                                {
                                    eastLimit = this.southUmbraLine[i].longitude;
                                }
                            }
                            if (southLimit > this.southUmbraLine[i].latitude)
                            {
                                southLimit = this.southUmbraLine[i].latitude;
                            }
                            if (i > 0)
                            {
                                if (westLimit == null)
                                {
                                    westLimit = this.southUmbraLine[i - 1].longitude;
                                }
                                else
                                {
                                    if (isWest(westLimit, this.southUmbraLine[i - 1].longitude))
                                    {
                                        westLimit = this.southUmbraLine[i - 1].longitude;
                                    }
                                }

                                if (southLimit > this.southUmbraLine[i - 1].latitude)
                                {
                                    southLimit = this.southUmbraLine[i - 1].latitude;
                                }
                            }

                            continue;
                        }
                        // Look forward half max annular time after mid eclipse at limit line.
                        if (lineTime.getTime() >= lastSearchTime)
                        {
                            bLastTimeFound = true;
                            if (eastLimit == null)
                            {
                                eastLimit = this.southUmbraLine[i].longitude;
                            }
                            else
                            {
                                if (isEast(eastLimit, this.southUmbraLine[i].longitude))
                                {
                                    eastLimit = this.southUmbraLine[i].longitude;
                                }
                            }
                            if (southLimit > this.southUmbraLine[i].latitude)
                            {
                                southLimit = this.southUmbraLine[i].latitude;
                            }
                            if (i > 0)
                            {
                                if (westLimit == null)
                                {
                                    westLimit = this.southUmbraLine[i - 1].longitude;
                                }
                                else
                                {
                                    if (isWest(westLimit, this.southUmbraLine[i - 1].longitude))
                                    {
                                        westLimit = this.southUmbraLine[i - 1].longitude;
                                    }
                                }

                                if (southLimit > this.southUmbraLine[i - 1].latitude)
                                {
                                    southLimit = this.southUmbraLine[i - 1].latitude;
                                }
                            }
                                                       
                            break;
                        }
                    }
                }
               
                if (bFirstTimeFound && !bLastTimeFound) // The eclipse should be still occurring use the end of the limit line.
                {
                    i--;
                    if(i > 0)
                    {
                        if (eastLimit == null)
                        {
                            eastLimit = this.southUmbraLine[i].longitude;
                        }
                        else if (isEast(eastLimit, this.southUmbraLine[i].longitude))
                        {
                            eastLimit = this.southUmbraLine[i].longitude;
                        }
                        if (southLimit > this.southUmbraLine[i].latitude)
                        {
                            southLimit = this.southUmbraLine[i].latitude;
                        }
                        if (i > 0)
                        {
                            if (westLimit == null)
                            {
                                westLimit = this.southUmbraLine[i - 1].longitude;
                            }
                            else
                            {
                                if (isWest(westLimit, this.southUmbraLine[i - 1].longitude))
                                {
                                    westLimit = this.southUmbraLine[i - 1].longitude;
                                }
                            }

                            if (southLimit > this.southUmbraLine[i - 1].latitude)
                            {
                                southLimit = this.southUmbraLine[i - 1].latitude;
                            }
                        }
                    }
                }
                
                if (southLimit == 90.0)	// Invalid time used.
                {
                    return null;
                }
                
                southLimit = incrementLat(southLimit, -0.05);	// Round down, just to make sure we capture everything.  Not sure if necessary?
                
                limits.setSouthLimit(southLimit);
            }
            else
            {
                limits.setSouthLimit(-90.0);
            }
            
            
            // Now checking central line for east west limit extensions, if the central line exist.
            if (this.centralLineTimes)
            {
                for (var stance = 2; stance < 4; stance++)	// Loop twice for C2 and C3 limits
                {
                    for (var i = 0; i < this.centralLineTimes.length; i++)
                    {
                        if (stance == 2)
                        {
                            if (this.centralLineTimes[i].getC2Date())
                            {
                                if (this.centralLineTimes[i].getC2Date().getTime() >= time.getTime())
                                {
                                    if(eastLimit == null)
                                    {
                                        eastLimit = this.centralLine[i].longitude;
                                    }
                                    else if (isEast(eastLimit, this.centralLine[i].longitude))
                                    {
                                        eastLimit = this.centralLine[i].longitude;
                                    }
                                    
                                    break;
                                }
                            }
                        }
                        else
                        {
                            if (this.centralLineTimes[i].getC3Date())
                            {
                                if (this.centralLineTimes[i].getC3Date().getTime() >= time.getTime())
                                {
                                    if(westLimit == null)
                                    {
                                        westLimit = this.centralLine[i].longitude;
                                    }
                                    if (isWest(westLimit, this.centralLine[i].longitude))
                                    {
                                        westLimit = this.centralLine[i].longitude;
                                    }
                                    
                                    if (i > 0)
                                    {
                                        if (isWest(westLimit, this.centralLine[i - 1].longitude))
                                        {
                                            westLimit = this.centralLine[i - 1].longitude;
                                        }
                                    }
                                    
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            
            eastLimit = incrementLong(eastLimit, 1.0); // Round up to make sure we capture everything, not sure if we really need to do this.
            
            limits.setEastLimit(eastLimit);
            
            westLimit = incrementLong(westLimit, -0.2);
            
            limits.setWestLimit(westLimit);			
        }
        
        return limits;
    };
    
    /*
     * Draw penumbral shadow at a specified input time.
     * Penumbral shadow limits must be drawn first!
     * Returns null upon failure.
     * Returns array of Position objects upon success.
     */
    this.drawPenumbraShadow = function(time)
    {
        var shadow = null;
        
        var limits = this.getPenumbraLimits();
        
        if (limits)	// If we don't get these values, wrong eclipse or umbra lines not drawn yet.
        {
            var longOffset = 2.0;
            var latitudeOffset = 2.0;
            var deltaLong = 0.0;
            
            var totalLongOffset = 0.0;
            var maxLongOffset = degreesWest(limits.getEastLimit(), limits.getWestLimit());
            var currentLongitude = 0.0;
            var c4Longitude = 0.0;
            var c1Longitude = 0.0;
            var currentLatitude = 0.0;
            var isVisible = false;
            
            var c4Time = null;
            var last_c4Time = null;
            var c1Time = null;
            var last_c1Time = null;
            var wasVisible = false;
           
            var lastSolarElevation = 0.0;
            var solarElevation = 0.0;
            
            var currentCircumstances = new ObserverCircumstances();
            
            shadow = [];
            var c4Shadow = [];
            
            maxLongOffset = Math.abs(maxLongOffset);
            
            for (currentLatitude = limits.getSouthLimit();
                    currentLatitude < limits.getNorthLimit();
                    currentLatitude += latitudeOffset
                    )
            {                
                totalLongOffset = 0.0;
                currentLongitude = incrementLong(limits.getWestLimit(), totalLongOffset);
                currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                last_c4Time = currentCircumstances.circDates.getC4Date();
                last_c1Time = currentCircumstances.circDates.getC1Date();
                lastSolarElevation = getSolarElevation(currentLatitude, currentLongitude, time);
                wasVisible = currentCircumstances.isVisible;
                
                // Because of rounding issues, situtation may come up where eclipse just came up over horizon and already started.
                // This should only happen at the extereme north and south limits.
                if((lastSolarElevation < 2.0 && lastSolarElevation >= 0.0) && wasVisible) 
                {
                    if (c4Time != null && c1Time != null)
                    {
                        if (c4Time.getTime() >= time.getTime() && (c1Time.getTime() <= time.getTime()))	// Eclipse is still occurring.
                        {
                            continue;
                        }
                    }
                }
               
                for (totalLongOffset += longOffset;
                     totalLongOffset <= maxLongOffset;
                     totalLongOffset += longOffset)
                {
                    currentLongitude = incrementLong(limits.getWestLimit(), totalLongOffset);
                    
                    currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                    c4Time = currentCircumstances.circDates.getC4Date();
                    c1Time = currentCircumstances.circDates.getC1Date();
                    solarElevation = getSolarElevation(currentLatitude, currentLongitude, time);
                    isVisible = currentCircumstances.isVisible;
                    
                    if (isVisible || wasVisible)	// Eclipse must have been visible at some point to be a good point!
                    {
                        if (c4Time && last_c4Time)
                        {
                            if ((lastSolarElevation <= 0.0 && solarElevation > 0.0))	// The Sun has now risen.
                            {
                                if (c4Time.getTime() >= time.getTime() && (c1Time.getTime() <= time.getTime()))	// Eclipse is still occurring.
                                {
                                    deltaLong = (-1.0) * longOffset * (Math.abs(solarElevation) / (Math.abs(lastSolarElevation) + Math.abs(solarElevation)));
                                    c4Longitude = incrementLong(currentLongitude, deltaLong);
                                    c4Shadow.push(new Position(currentLatitude, c4Longitude));
                                }
                            }
                            if ((c4Time.getTime() >= time.getTime()) && (last_c4Time.getTime() <= time.getTime()) && solarElevation >= 0.0)	// Crossed times
                            {
                                deltaLong = (-1.0) * longOffset * (Math.abs(time.getTime() - c4Time.getTime()) / (Math.abs(time.getTime() - c4Time.getTime()) + Math.abs(time.getTime() - last_c4Time.getTime())));
                                c4Longitude = incrementLong(currentLongitude, deltaLong);
                                c4Shadow.push(new Position(currentLatitude, c4Longitude));  
                            }
                            if ((c4Time.getTime() <= time.getTime()) && (last_c4Time.getTime() >= time.getTime()) && solarElevation >= 0.0)	// Crossed times
                            {
                                deltaLong = (-1.0) * longOffset * (Math.abs(time.getTime() - c4Time.getTime()) / (Math.abs(time.getTime() - c4Time.getTime()) + Math.abs(time.getTime() - last_c4Time.getTime())));
                                c4Longitude = incrementLong(currentLongitude, deltaLong);
                                c4Shadow.push(new Position(currentLatitude, c4Longitude)); // Actually otherside of shadow, for easy sorting.
                            }
                        }
                        
                        if (c1Time && last_c1Time)
                        {
                            if ((c1Time.getTime() >= time.getTime()) && (last_c1Time.getTime() <= time.getTime()) && solarElevation >= 0.0) // Went from first contact has started, to have not started.
                            {
                                deltaLong = (-1.0) * longOffset * (Math.abs(time.getTime() - c1Time.getTime()) / (Math.abs(time.getTime() - c1Time.getTime()) + Math.abs(time.getTime() - last_c1Time.getTime())));
                                c1Longitude = incrementLong(currentLongitude, deltaLong);
                                shadow.push(new Position(currentLatitude, c1Longitude));
                            }
                            if ((c1Time.getTime() <= time.getTime()) && (last_c1Time.getTime() >= time.getTime()) && solarElevation >= 0.0) // Went from first contact has started, to have not started.
                            {
                                deltaLong = (-1.0) * longOffset * (Math.abs(time.getTime() - c1Time.getTime()) / (Math.abs(time.getTime() - c1Time.getTime()) + Math.abs(time.getTime() - last_c1Time.getTime())));
                                c1Longitude = incrementLong(currentLongitude, deltaLong);
                                shadow.push(new Position(currentLatitude, c1Longitude));  // Actually otherside of shadow, for easy sorting.
                            }
                            if (lastSolarElevation >= 0.0 && solarElevation < 0.0)	// The Sun has now set.
                            {
                                if (last_c4Time.getTime() >= time.getTime() && (last_c1Time.getTime() <= time.getTime()))	// Eclipse was still occurring.
                                {
                                    deltaLong = (-1.0) * longOffset * (Math.abs(solarElevation) / (Math.abs(lastSolarElevation) + Math.abs(solarElevation)));
                                    c1Longitude = incrementLong(currentLongitude, deltaLong);
                                    shadow.push(new Position(currentLatitude, c1Longitude));
                                    break;		// Once a first contact shadow position is grabbed  at sunset continue on to next latitude.  Since we are scanning east to west.
                                }
                            }
                        }
                    }
                    
                    last_c4Time = c4Time;
                    last_c1Time = c1Time;
                    lastSolarElevation = solarElevation;
                    wasVisible = isVisible;
                }
            }
         
            if(c4Shadow.length > 0)
            {
               c4Shadow = this.sortShadowLine(true, c4Shadow);
            }
            if(shadow.length > 0)
            {
               shadow = this.sortShadowLine(false, shadow);
            }
                      
            if(c4Shadow.length > 0)
            {
                shadow = shadow.concat(c4Shadow.reverse());
            }
            
            if(shadow.length > 1)
            {
                shadow = shadow.concat(shadow[0]);
            }
            
            if (shadow.length < 2)	// Not enough points found, error?
            {
                shadow = null;
            }
            
        }
        
        return shadow;
    };
    
    /* Input a shadow line and sort the points.
     * Excpects a south to north input, sorts line and returns a new array
     * Set isWest to true for wester shadow line, ealse false for easter line.
     * @param {Boolean} bWest
     * @param {Array} shadow
     * @returns {Array}
     */
    this.sortShadowLine = function(bWest, shadow)
    {
        var limit = shadow[0].longitude;
        var limitIndex = 0;
        
        for(var i = 0; i < shadow.length; i++)
        {
            // Find the east or west most point on shadow line.
            if(bWest)
            {
                if(isWest(limit, shadow[i].longitude))
                {
                    limit = shadow[i].longitude;
                    limitIndex = i;
                }
            }
            else
            {
                if(!isWest(limit, shadow[i].longitude))
                {
                    limit = shadow[i].longitude;
                    limitIndex = i;
                }
            }
        }
        
        var firstQuadrant = [];
        var secondQuadrant = [];
        
        firstQuadrant = firstQuadrant.concat(shadow.slice(0, limitIndex + 1));
        secondQuadrant = secondQuadrant.concat(shadow.slice(limitIndex + 1, shadow.length));
        
        if(bWest)
        {
            // For western shadow line, sort the southern 1/4 from east to west.
            firstQuadrant.sort(sortWest);
            
            secondQuadrant.sort(sortEast);
            secondQuadrant = secondQuadrant.concat(firstQuadrant)
            return secondQuadrant;
        }
        else
        {
            // For easter shadow line, sort the souther 1/4 from west to east.
            firstQuadrant.sort(sortEast);
            
            secondQuadrant.sort(sortWest);
            secondQuadrant = secondQuadrant.concat(firstQuadrant);
            return secondQuadrant;
        }
        
        return firstQuadrant;        
    };
    
    /*
     * Draw (ant)umbral shadow at a specified input time.
     * Must be total/annular/hybrid eclipse
     * Umbral shadow limits must be drawn first!
     * Returns null upon failure.
     * Returns array of Position objects upon success.
     */
    this.drawUmbraShadow = function(time)
    {
        var shadow = null;
        
        var limits = this.getUmbraLimits(time);
        
        if (limits)	// If we don't get these values, wrong eclipse or umbra lines not drawn yet.
        {
            var longOffset = 0.25;       // Sample rate for longitude in umbra shadow drawing.
            var latitudeOffset = 0.05;  // Sample rate for latitude in umbra shadow drawing.
            
            var totalLongOffset = 0.0;
            var maxLongOffset = incrementLong(0.0, limits.getWestLimit() - limits.getEastLimit());
            var currentLongitude = 0.0;
            var c3Longitude = 0.0;
            var c2Longitude = 0.0;
            var currentLatitude = 0.0;
            var deltaLong = 0.0;
            
            var c3Time = null;
            var last_c3Time = null;
            var c2Time = null;
            var last_c2Time = null;
            
            var lastSolarElevation = 0.0;
            var solarElevation = 0.0;
            var wasVisible = false;
            var isVisible = false;
            
            var currentCircumstances = new ObserverCircumstances();
            
            shadow = [];
            var c3Shadow = [];
            
            maxLongOffset = Math.abs(maxLongOffset);
            
            for (currentLatitude = limits.getSouthLimit();
                    currentLatitude <= limits.getNorthLimit();
                    currentLatitude += latitudeOffset
                    )
            {
                totalLongOffset = 0.0;
                currentLongitude = incrementLong(limits.getWestLimit(), totalLongOffset);
                currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                last_c3Time = currentCircumstances.circDates.getC3Date();
                last_c2Time = currentCircumstances.circDates.getC2Date();
                lastSolarElevation = getSolarElevation(currentLatitude, currentLongitude, time);
                wasVisible = currentCircumstances.isVisible;
                
                // Because of rounding issues, situtation may come up where eclipse just came up over horizon and already started.
                // This should only happen at the extereme north and south limits.
                if((lastSolarElevation < 2.0 && lastSolarElevation >= 0.0) && wasVisible) 
                {
                    if(c3Time != null && c2Time != null)
                    {
                        if (c3Time.getTime() >= time.getTime() && (c2Time.getTime() <= time.getTime()))	// Eclipse is still occurring.
                        {
                            continue;
                        }
                    }
                }
                
                for (totalLongOffset += longOffset;
                        totalLongOffset <= maxLongOffset;
                        totalLongOffset += longOffset)
                {
                    currentLongitude = incrementLong(limits.getWestLimit(), totalLongOffset);
                    
                    currentCircumstances = this.calculateLocalCircumstances(currentLatitude, currentLongitude, 0.0);
                    c3Time = currentCircumstances.circDates.getC3Date();
                    c2Time = currentCircumstances.circDates.getC2Date();
                    solarElevation = getSolarElevation(currentLatitude, currentLongitude, time);
                    isVisible = currentCircumstances.isVisible;
                    
                    if (isVisible || wasVisible)	// Eclipse must have been visible at some point to be a good point!
                    {
                        if (c3Time && last_c3Time)
                        {
                            if ((lastSolarElevation <= 0.0 && solarElevation > 0.0))	// The Sun has now risen.
                            {
                                if (c3Time.getTime() >= time.getTime() && (c2Time.getTime() <= time.getTime()))	// Eclipse is still occurring.
                                {
                                    deltaLong = (-1.0) * longOffset * (Math.abs(solarElevation) / (Math.abs(lastSolarElevation) + Math.abs(solarElevation)));
                                    c3Longitude = incrementLong(currentLongitude, deltaLong);
                                    c3Shadow.push(new Position(currentLatitude, c3Longitude));
                                }
                            }
                            
                            if((c3Time.getTime() >= time.getTime()) && (last_c3Time.getTime() <= time.getTime()) && solarElevation >= 0.0)	// Crossed times
                            {
                                deltaLong = (-1.0) * longOffset * (Math.abs(time.getTime() - c3Time.getTime()) / (Math.abs(time.getTime() - c3Time.getTime()) + Math.abs(time.getTime() - last_c3Time.getTime())));
                                c3Longitude = incrementLong(currentLongitude, deltaLong);
                                c3Shadow.push(new Position(currentLatitude, c3Longitude));
                            }
                         
                           
                            if ((c3Time.getTime() <= time.getTime()) && (last_c3Time.getTime() >= time.getTime()) && solarElevation >= 0.0)	// Crossed times
                            {
                                deltaLong = (-1.0) * longOffset * (Math.abs(time.getTime() - c3Time.getTime()) / (Math.abs(time.getTime() - c3Time.getTime()) + Math.abs(time.getTime() - last_c3Time.getTime())));
                                c3Longitude = incrementLong(currentLongitude, deltaLong);
                                shadow.push(new Position(currentLatitude, c3Longitude)); // Not really the c2 line, but makes sorting easy!!!
                            }
                        }

                        if (c2Time && last_c2Time)
                        {
                            
                            if ((c2Time.getTime() >= time.getTime()) && (last_c2Time.getTime() <= time.getTime()) && solarElevation >= 0.0)
                            {
                                deltaLong = (-1.0) * longOffset * (Math.abs(time.getTime() - c2Time.getTime()) / (Math.abs(time.getTime() - c2Time.getTime()) + Math.abs(time.getTime() - last_c2Time.getTime())));
                                c2Longitude = incrementLong(currentLongitude, deltaLong);
                                shadow.push(new Position(currentLatitude, c2Longitude));
                            }
                            else if ((c2Time.getTime() <= time.getTime()) && (last_c2Time.getTime() >= time.getTime()) && solarElevation >= 0.0)
                            {
                                deltaLong = (-1.0) * longOffset * (Math.abs(time.getTime() - c2Time.getTime()) / (Math.abs(time.getTime() - c2Time.getTime()) + Math.abs(time.getTime() - last_c2Time.getTime())));
                                c2Longitude = incrementLong(currentLongitude, deltaLong);
                                c3Shadow.push(new Position(currentLatitude, c2Longitude));  // Not really the c3 line, but makes sorting easy!!!
                            }
                                
                            else if (lastSolarElevation >= 0.0 && solarElevation < 0.0)	// The Sun has now set.
                            {
                                if (last_c3Time.getTime() >= time.getTime() && (last_c2Time.getTime() <= time.getTime()))	// Eclipse was still occurring.
                                {
                                    deltaLong = (-1.0) * longOffset * (Math.abs(solarElevation) / (Math.abs(lastSolarElevation) + Math.abs(solarElevation)));
                                    c2Longitude = incrementLong(currentLongitude, deltaLong);
                                    shadow.push(new Position(currentLatitude, c2Longitude));
                                    break;		// Once a first contact shadow position is grabbed  at sunset continue on to next latitude.  Since we are scanning east to west.
                                }
                                
                            }
                        }

                        last_c3Time = c3Time;
                        last_c2Time = c2Time;
                        lastSolarElevation = solarElevation;
                        wasVisible = isVisible;
                    }
                }
            }
           
            if(c3Shadow.length > 1)
            {
                c3Shadow = c3Shadow.reverse();
                shadow = shadow.concat(c3Shadow);  // We picked up c3 shadow points in reverse order
            }
            
            if(shadow.length > 1)
            {
                shadow = shadow.concat(shadow[0]);	// Completes a shadow ellipse.
            }
            
            if (shadow.length < 2)	// Not enough points found, error?
            {
                shadow = null;
            }
        }
        
        return shadow;
    };
    
    
    /*
     * Returns a Julian day value from circumstances
     * DOES NOT WORK!!! I'd like it to, someday.
     */
    this.getJulianDay = function(circumstances)
    {
        var julianDay = 0;
        
        // Calculate the local time. Add 0.05 seconds, as we will be rounding up to the nearest 0.1 sec
        var time_diff = circumstances.t + this.besselianElements.t0 - (this.besselianElements.dUTC - 0.05) / 3600.0;
        
        if (time_diff < 0.0) 
        {
            time_diff = time_diff + 24.0;
        }
        if (time_diff >= 24.0) 
        {
            time_diff = time_diff - 24.0;
        }
        // Calculate the JD for as close to local noon as possible, and convert into a date
        // This algorithm, as is, will only work for the period 1900/03/01 to 2100/02/28
        julianDay = this.besselianElements.julianDayMax - (time_diff / 24.0); // + 1538.0;
        
        return julianDay;
    };
    
    // Get the altitude
    this.getAlt = function(circumstances)
    {
        return (circumstances.alt * 180.0 / Math.PI);
    };
    
    // Get the azimuth
    this.getAzi = function(circumstances)
    {
        var degrees = circumstances.azi * 180.0 / Math.PI;
        
        if (degrees < 0.0) 
        {
            degrees += 360.0;
        }
        
        if (degrees >= 360.0) 
        {
            degrees -= 360.0;
        }
        
        return degrees;
    };
    
    this.getP = function(circumstances)
    {
        var deg = circumstances.p * 180.0 / Math.PI;
        if (deg < 0.0) 
        {
            deg += 360.0;
        }
        
        if (deg >= 360.0) 
        {
            deg -= 360.0;
        }
        
        return deg;
    };
    
    /*
     * Returns a Date object from circumstances
     * Creates a UTC date, works in UTC time.
     * This works.
     */
    this.getDate = function(circumstances)
    {
        var julianDay = 0;	// Not sure if this is a Julian Day or a Julian Date?
        
        // Calculate the local time. Add 0.05 seconds, as we will be rounding up to the nearest 0.1 sec
        // Removing (- 0.05) since we don't round anymore.
        var time_diff = circumstances.t + this.besselianElements.t0 - this.besselianElements.dUTC / 3600.0;
        
        if (time_diff < 0.0) 
        {
            time_diff = time_diff + 24.0;
        }
        if (time_diff >= 24.0) 
        {
            time_diff = time_diff - 24.0;
        }
        
        // Calculate the JD for as close to local noon as possible, and convert into a date
        // This algorithm, as is, will only work for the period 1900/03/01 to 2100/02/28
        julianDay = Math.floor(this.besselianElements.julianDayMax - (time_diff / 24.0) + 1538.0);
        var year = Math.floor((julianDay - 122.1) / 365.25);
        var day = Math.floor(365.25 * year);
        var month = Math.floor((julianDay - day) / 30.6001);
        day = julianDay - day - Math.floor(30.6001 * month);
        if (month < 13.5) 
        {
            month = month - 1;
        } else 
        {
            month = month - 13;
        }
        if (month > 2.5) 
        {
            year -= 4716;
        }	 
        else 
        {
            year -= 4715;
        }
        
        month--;	// For Javascript Date object.
        
        var hours = Math.floor(time_diff);
        
        var minutes = (time_diff * 60.0) - 60.0 * Math.floor(time_diff);
        
        var seconds = (minutes * 60.0) - 60.0 * Math.floor(minutes);
        
        var milliseconds = Math.round((seconds - Math.floor(seconds)) * 1000);
        
        minutes = Math.floor(minutes);
        seconds = Math.floor(seconds);
        
        var ret_date = new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));
        
        return ret_date;
    };
    
    // Calculate all the circumstances!
    this.getAll = function()
    {
        
        this.getMid();
        this.observational(this.midCircumstances);
        
        // Calculate m, magnitude and moon/sun
        this.midCircumstances.mid = Math.sqrt(this.midCircumstances.u * this.midCircumstances.u + this.midCircumstances.vLoc * this.midCircumstances.vLoc);
        this.midCircumstances.magnitude = (this.midCircumstances.l1prime - this.midCircumstances.mid) / (this.midCircumstances.l1prime + this.midCircumstances.l2prime);
        this.midCircumstances.moonSun = (this.midCircumstances.l1prime - this.midCircumstances.l2prime) / (this.midCircumstances.l1prime + this.midCircumstances.l2prime);
        
        /*** This is computational expensive, however, need to do it to calculate eclipse lines accurately. ***/
        this.getC1C4();
        this.observational(this.c1Circumstances);
        this.observational(this.c4Circumstances);
        
        this.getC2C3();
        this.observational(this.c2Circumstances);
        this.observational(this.c3Circumstances);
        
        if (this.midCircumstances.magnitude > 0.0) 
        {
            if ((this.midCircumstances.mid < this.midCircumstances.l2prime) || (this.midCircumstances.mid < -this.midCircumstances.l2prime)) 
            {
                if (this.midCircumstances.l2prime < 0.0) 
                {
                    this.midCircumstances.localType = 3; // Total eclipse
                }
                else 
                {
                    this.midCircumstances.localType = 2; // Annular eclipse
                }
                
                // Do lunar limb corrections here.
                // Not doing this yet, but saving some old code to make it work later.
                if (false)	// This code block will not execute. 
                {
                    this.c2Circumstances.mid = limbcorrection(this.c2Circumstances.p, C2limb2003May);
                    this.c3Circumstances.mid = limbcorrection(this.c3Circumstances.p, C3limb2003May);
                    if (this.c2Circumstances.mid < 990.0) 
                    {
                        this.c2Circumstances.t += this.c2Circumstances.mid / 3600.0;
                    }
                    if (this.c3Circumstances.mid < 990.0) 
                    {
                        this.c3Circumstances.t += this.c3Circumstances.mid / 3600.0;
                    }
                }	 
                else 
                {
                    this.c2Circumstances.mid = 999.9;
                    this.c3Circumstances.mid = 999.9;
                }
            } 
            else 
            {
                this.midCircumstances.localType = 1; // Partial eclipse
            }
        } 
        else 
        {
            this.midCircumstances.localType = 0; // No eclipse
        }
    };
    
    // Get the coverage
    // Returns the coverage of the Sun in percent.
    // 100 = 100%, 98.9934 = 98.9934%
    this.getCoverage = function() 
    {
        var a, b, c;
        
        if (this.midCircumstances.magnitude <= 0.0)
        {
            return 0.0;
        }
        
        if (this.midCircumstances.magnitude >= 1.0)
        {	
            return 100.0;
        }
        
        if (this.midCircumstances.localType == 2)
        {
            c = this.midCircumstances.moonSun * this.midCircumstances.moonSun;
        }
        else
        {
            c = Math.acos((this.midCircumstances.l1prime * this.midCircumstances.l1prime + this.midCircumstances.l2prime * this.midCircumstances.l2prime - 2.0 * this.midCircumstances.mid * this.midCircumstances.mid) / (this.midCircumstances.l1prime * this.midCircumstances.l1prime - this.midCircumstances.l2prime * this.midCircumstances.l2prime));
            b = Math.acos((this.midCircumstances.l1prime * this.midCircumstances.l2prime + this.midCircumstances.mid * this.midCircumstances.mid) / this.midCircumstances.mid / (this.midCircumstances.l1prime + this.midCircumstances.l2prime));
            a = Math.PI - b - c;
            c = ((this.midCircumstances.moonSun * this.midCircumstances.moonSun * a + b) - this.midCircumstances.moonSun * Math.sin(c)) / Math.PI;
        }
        
        if (c)
        {
            c = (1000.0 * c + 0.5) / 10.0;
            a = c;
            /***
             a = Math.floor(c) + ".";
             a = a + Math.floor(10.0 * c - Math.floor(c) * 10.0);
             a = a + "%";
             ***/
        }
        else
        {
            return 0.0;
        }
        
        return a;
    };
    
    // Get the (Ant)Umbral depth
    // Entry condition - there is a total or annular eclipse
    this.getDepth = function() 
    {
        var depth = 0.0;
        
        depth = Math.abs(this.midCircumstances.mid / this.midCircumstances.l2prime);
        
        if (depth < 0.0)
        {
            depth = 1.0 + depth;
        }
        else
        {
            depth = 1.0 - depth;
        }
        
        depth *= 100.0;
        
        return depth;
    };
    
    // Calculate mid eclipse
    this.getMid = function() 
    {
        var iter = 0, tmp = 1.0;
        
        this.midCircumstances.eventType = 0;
        this.midCircumstances.t = 0.0;
        
        this.timeLocalDependent(this.midCircumstances);
        
        while (((tmp > 0.000001) || (tmp < -0.000001)) && (iter < CALC_ITERATIONS)) 
        {
            tmp = (this.midCircumstances.u * this.midCircumstances.a + this.midCircumstances.vLoc * this.midCircumstances.b) / this.midCircumstances.nSquared;
            this.midCircumstances.t = this.midCircumstances.t - tmp;
            iter++;
            this.timeLocalDependent(this.midCircumstances);
        }
    };
    
    //	 Get C1 and C4 data
    //   Entry conditions -
    //   1. The mid array must be populated
    //   2. The magnitude at mid eclipse must be > 0.0
    this.getC1C4 = function() 
    {
        var tmp, n;
        
        n = Math.sqrt(this.midCircumstances.nSquared);
        tmp = this.midCircumstances.a * this.midCircumstances.vLoc - this.midCircumstances.u * this.midCircumstances.b;
        tmp = tmp / n / this.midCircumstances.l1prime;
        tmp = Math.sqrt(1.0 - tmp * tmp) * this.midCircumstances.l1prime / n;
        this.c1Circumstances.eventType = -2;
        this.c4Circumstances.eventType = 2;
        this.c1Circumstances.t = this.midCircumstances.t - tmp;
        this.c4Circumstances.t = this.midCircumstances.t + tmp;
        
        this.c1c4Iterate(this.c1Circumstances);
        this.c1c4Iterate(this.c4Circumstances);
    };
    
    // Iterate on C1 or C4
    this.c1c4Iterate = function(circumstances) 
    {
        var sign, iter, tmp, n;
        
        this.timeLocalDependent(circumstances);
        
        if (circumstances.eventType < 0)
        {
            sign = -1.0;
        }
        else
        {
            sign = 1.0;
        }
        
        tmp = 1.0;
        iter = 0;
        
        while (((tmp > 0.000001) || (tmp < -0.000001)) && (iter < CALC_ITERATIONS))
        {
            n = Math.sqrt(circumstances.nSquared);
            tmp = circumstances.a * circumstances.vLoc - circumstances.u * circumstances.b;
            tmp = tmp / n / circumstances.l1prime;
            tmp = sign * Math.sqrt(1.0 - tmp * tmp) * circumstances.l1prime / n;
            tmp = (circumstances.u * circumstances.a + circumstances.vLoc * circumstances.b) / circumstances.nSquared - tmp;
            circumstances.t = circumstances.t - tmp;
            this.timeLocalDependent(circumstances);
            iter++;
        }
        
        return circumstances;
    };
    
    // Get C2 and C3 data
    //   Entry conditions -
    //   1. The this.midCircumstances array must be populated
    //   2. There mut be either a total or annular eclipse at the location!
    this.getC2C3 = function() 
    {
        var tmp, n;
        
        n = Math.sqrt(this.midCircumstances.nSquared);
        tmp = this.midCircumstances.a * this.midCircumstances.vLoc - this.midCircumstances.u * this.midCircumstances.b;
        tmp = tmp / n / this.midCircumstances.l2prime;
        tmp = Math.sqrt(1.0 - tmp * tmp) * this.midCircumstances.l2prime / n;
        this.c2Circumstances.eventType = -1;
        this.c3Circumstances.eventType = 1;
        
        if (this.midCircumstances.l2prime < 0.0)
        {
            this.c2Circumstances.t = this.midCircumstances.t + tmp;
            this.c3Circumstances.t = this.midCircumstances.t - tmp;
        }
        else
        {
            this.c2Circumstances.t = this.midCircumstances.t - tmp;
            this.c3Circumstances.t = this.midCircumstances.t + tmp;
        }
        
        this.c2c3Iterate(this.c2Circumstances);
        this.c2c3Iterate(this.c3Circumstances);
    };
    
    // Iterate on C2 or C3
    this.c2c3Iterate = function(circumstances)
    {
        var sign, iter, tmp, n;
        
        this.timeLocalDependent(circumstances);
        
        if (circumstances.eventType < 0)
        {
            sign = -1.0;
        }
        else
        {
            sign = 1.0;
        }
        
        if (this.midCircumstances.l2prime < 0.0)
        {
            sign = -sign;
        }
        
        tmp = 1.0;
        iter = 0;
        
        while (((tmp > 0.000001) || (tmp < -0.000001)) && (iter < 50))
        {
            n = Math.sqrt(circumstances.nSquared);
            tmp = circumstances.a * circumstances.vLoc - circumstances.u * circumstances.b;
            tmp = tmp / n / circumstances.l2prime;
            tmp = sign * Math.sqrt(1.0 - tmp * tmp) * circumstances.l2prime / n;
            tmp = (circumstances.u * circumstances.a + circumstances.vLoc * circumstances.b) / circumstances.nSquared - tmp;
            circumstances.t = circumstances.t - tmp;
            this.timeLocalDependent(circumstances);
            iter++;
        }
        
        return circumstances;
    };
    
    // Populate the circumstances object with the time and location dependent circumstances
    this.timeLocalDependent = function(circumstances) 
    {
        var ans, type;
        
        this.timeDependent(circumstances);
        
        // Calculate h, sin h, cos h
        circumstances.h = circumstances.mu - this.observerConstants.getLongRadians() - (this.besselianElements.dT / 13713.44);
        circumstances.sinH = Math.sin(circumstances.h);
        circumstances.cosH = Math.cos(circumstances.h);
        
        // Calculate xi
        circumstances.xi = this.observerConstants.getRhoCosO() * circumstances.sinH;
        
        // Calculate eta
        circumstances.eta = this.observerConstants.getRhoSinO() * circumstances.cosDelta - this.observerConstants.getRhoCosO() * circumstances.cosH * circumstances.sinDelta;
        
        // Calculate zeta
        circumstances.zeta = this.observerConstants.getRhoSinO() * circumstances.sinDelta + this.observerConstants.getRhoCosO() * circumstances.cosH * circumstances.cosDelta;
        
        // Calculate dxi
        circumstances.dxi = circumstances.dmu * this.observerConstants.getRhoCosO() * circumstances.cosH;
        
        // Calculate deta
        circumstances.deta = circumstances.dmu * circumstances.xi * circumstances.sinDelta - circumstances.zeta * circumstances.dd;
        
        // Calculate u
        circumstances.u = circumstances.x - circumstances.xi;
        
        // Calculate vLoc
        circumstances.vLoc = circumstances.y - circumstances.eta;
        
        // Calculate a
        circumstances.a = circumstances.dx - circumstances.dxi;
        
        // Calculate b
        circumstances.b = circumstances.dy - circumstances.deta;
        
        // Calculate l1'
        
        type = circumstances.eventType;
        if ((type == -2) || (type == 0) || (type == 2)) 
        {
            circumstances.l1prime = circumstances.l1 - circumstances.zeta * this.besselianElements.tanF1;
        }
        
        // Calculate l2'
        if ((type == -1) || (type == 0) || (type == 1))
        {
            circumstances.l2prime = circumstances.l2 - circumstances.zeta * this.besselianElements.tanF2;
        }
        
        // Calculate n^2
        circumstances.nSquared = circumstances.a * circumstances.a + circumstances.b * circumstances.b;
        
        return circumstances;
    };
    
    // Populate the circumstances array with the time-only dependent circumstances (x, y, d, m, ...)
    this.timeDependent = function(circumstances)
    {
        var type, t, ans;
        
        t = circumstances.t;
        
        // Calculate x
        ans = this.besselianElements.x3 * t + this.besselianElements.x2;
        ans = ans * t + this.besselianElements.x1;
        ans = ans * t + this.besselianElements.x0;
        circumstances.x = ans;
        
        // Calculate dx
        ans = 3.0 * this.besselianElements.x3 * t + 2.0 * this.besselianElements.x2;
        ans = ans * t + this.besselianElements.x1;
        circumstances.dx = ans;
        
        // Calculate y
        ans = this.besselianElements.y3 * t + this.besselianElements.y2;
        ans = ans * t + this.besselianElements.y1;
        ans = ans * t + this.besselianElements.y0;
        circumstances.y = ans;
        
        // Calculate dy
        ans = 3.0 * this.besselianElements.y3 * t + 2.0 * this.besselianElements.y2;
        ans = ans * t + this.besselianElements.y1;
        circumstances.dy = ans;
        
        // Calculate d
        ans = this.besselianElements.d2 * t + this.besselianElements.d1;
        ans = ans * t + this.besselianElements.d0;
        ans = ans * Math.PI / 180.0;
        circumstances.d = ans;
        
        // sin d and cos d
        circumstances.sinDelta = Math.sin(ans);
        circumstances.cosDelta = Math.cos(ans);
        
        // Calculate dd
        ans = 2.0 * this.besselianElements.d2 * t + this.besselianElements.d1;
        ans = ans * Math.PI / 180.0;
        circumstances.dd = ans;
        
        // Calculate m
        ans = this.besselianElements.m2 * t + this.besselianElements.m1;
        ans = ans * t + this.besselianElements.m0;
        
        if (ans >= 360.0)
        {
            ans = ans - 360.0;
        }
        
        ans = ans * Math.PI / 180.0;
        circumstances.mu = ans;
        
        // Calculate dm
        ans = 2.0 * this.besselianElements.m2 * t + this.besselianElements.m1;
        ans = ans * Math.PI / 180.0;
        circumstances.dmu = ans;
        
        // Calculate l1 and dl1
        type = circumstances.eventType;
        if ((type == -2) || (type == 0) || (type == 2))
        {
            ans = this.besselianElements.l12 * t + this.besselianElements.l11;
            ans = ans * t + this.besselianElements.l10;
            circumstances.l1 = ans;
            circumstances.dl1 = 2.0 * this.besselianElements.l12 * t + this.besselianElements.l11;
        }
        
        // Calculate l2 and dl2
        if ((type == -1) || (type == 0) || (type == 1))
        {
            ans = this.besselianElements.l22 * t + this.besselianElements.l21;
            ans = ans * t + this.besselianElements.l20;
            circumstances.l2 = ans;
            circumstances.dl2 = 2.0 * this.besselianElements.l22 * t + this.besselianElements.l21;
        }
        
        return circumstances;
    };
    
    // Get the observational circumstances
    this.observational = function(circumstances) 
    {
        var contacttype, coslat, sinlat;
        // We are looking at an "external" contact UNLESS this is a total eclipse AND we are looking at
        // c2 or c3, in which case it is an INTERNAL contact! Note that if we are looking at mid eclipse,
        // then we may not have determined the type of eclipse (this.midCircumstances.eventType) just yet!
        
        if (circumstances.eventType == 0)
        {
            contacttype = 1.0;
        }
        else
        {
            if ((this.midCircumstances.localType == 3) && ((circumstances.eventType == -1) || (circumstances.eventType == 1)))
            {
                contacttype = -1.0;
            }
            else
            {
                contacttype = 1.0;
            }
        }
        
        // Calculate p
        circumstances.p = Math.atan2(contacttype * circumstances.u, contacttype * circumstances.vLoc);
        
        // Calculate alt
        sinlat = Math.sin(this.observerConstants.getLatRadians());
        coslat = Math.cos(this.observerConstants.getLatRadians());
        circumstances.alt = Math.asin(circumstances.sinDelta * sinlat + circumstances.cosDelta * coslat * circumstances.cosH);
        
        // Calculate q
        circumstances.q = Math.asin(coslat * circumstances.sinH / Math.cos(circumstances.alt));
        if (circumstances.eta < 0.0)
        {
            circumstances.q = Math.PI - circumstances.q;
        }
        
        // Calculate vObs
        circumstances.vObs = circumstances.p - circumstances.q;
        
        // Calculate azi
        circumstances.azi = Math.atan2(-1.0 * circumstances.sinH * circumstances.cosDelta, circumstances.sinDelta * coslat - circumstances.cosH * sinlat * circumstances.cosDelta);
    };
    
    /*
     * Sets Julian Day for max time of eclipse
     * Also sets a Date object for Max time
     * Input Julian Day for max eclipse time from eclipse elements.
     */
    this.setMaxJulianDay = function(julianDay)
    {
        this.besselianElements.julianDayMax = julianDay;
        this.maxEclipseDate = julianDayToTime(this.besselianElements.julianDayMax);
    };
    
    this.set(eclipse);
}

// Object for loading and holding an array of eclipses.
function Eclipses()
{
    this.eclipseArray = [];
    
    /*
     * Deletes all eclipses from object.
     * @returns {undefined}
     */
    this.deleteEclipses = function()
    {
        this.eclipseArray = [];
    };
    
    /* @param {EclipseData} eclipse
     * @returns {undefined}
     */
    this.addEclipse = function(eclipse)
    {
       this.eclipseArray.push(eclipse);        
    };
    
    /*
     * Returns eclipse data elements for specified index.
     * If index is invalid, function returns null.
     */
    this.getEclipse = function(index)
    {
        if (!isNaN(index))
        {
            if (index < this.getEclipseCount())
            {
                return this.eclipseArray[index];
            }
        }
        
        return null;
    };
    
    /*
     * Returns number of eclipse loaded into object.
     */
    this.getEclipseCount = function()
    {
        return this.eclipseArray.length;
    };
    
    /*
     * Returns the next eclipse to occur as an EclipseData object
     */
    this.getNextEclipse = function()
    {
        return this.eclipseArray[this.getNextEclipseIdx()];
    };
    
    /*
     * Returns the index of the next eclipse to occur on Earth.
     * Returns index of last eclipse if fail.
     * Adds a day to current time, so that on the day of an eclipse, that eclipse will stay loaded.
     */
    this.getNextEclipseIdx = function()
    {
        var yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 2);
        
        for (var idx = 0; idx < this.getEclipseCount(); idx++)
        {
            if (yesterday < this.eclipseArray[idx].maxEclipseDate)
            {
                break;
            }
        }
        
        if (idx >= this.getEclipseCount())
        {
            idx = this.getEclipseCount() - 1;
            if (idx < 0)
            {
                idx = 0;
            }
        }
        
        return idx;		
    };
    
    /*
     * isTimeClose(time_1, time_2, time_span)
     * time_1: required Date object
     * time_2: required Date object
     * time_span: optional long milliseconds. Default 1 minute of time.
     * Compares to times to see if they are with in the 'time_span' of each other.
     */
    this.isTimeClose = function(time_1, time_2, time_span)
    {
        var timeSpan = 1000 * 60;
        
        if (!isNaN(time_span))
        {
            timeSpan = time_span;
        }
        
        if (isNaN(time_1.getTime()))
        {
            return false;
        }
        
        if (isNaN(time_2.getTime()))
        {
            return false;
        }
        
        var diff = time_1.getTime() - time_2.getTime();
        
        if (diff <= timeSpan && diff >= ((-1) * timeSpan))
        {
            return true;
        }
        
        return false;
    };
    
    /*
     * Besselian elements javascript file has been loaded.
     * status: status of the getScript() function
     * onComplete: (optional) function to call on successful completion
     * onError: (optional) function to call on error loading elements.
     */
    this.onLoadBesselian = function(status, onComplete, onError)
    {
        if (status == "success")
        {
            var eclipses = SE1901();
            eclipses = eclipses.concat(SE2001());
            
            if (eclipses)
            {
                var eclipseData; 
                for (var i = 0; i < (eclipses.length - 27); i++)
                {
                    eclipseData = new EclipseData();
                    eclipseData.setMaxJulianDay(Number(eclipses[i]));
                    i++;
                    eclipseData.besselianElements.t0 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.tMin = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.tMax = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.dUTC = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.dT = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.x0 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.x1 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.x2 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.x3 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.y0 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.y1 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.y2 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.y3 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.d0 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.d1 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.d2 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.m0 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.m1 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.m2 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.l10 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.l11 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.l12 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.l20 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.l21 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.l22 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.tanF1 = Number(eclipses[i]);
                    i++;
                    eclipseData.besselianElements.tanF2 = Number(eclipses[i]);
                    
                    this.eclipseArray.push(eclipseData);
                }
                eclipses = null;
                
                this.sortEclipses();
                
                if (onComplete)
                {
                    onComplete();
                }
            }
            else
            {
                if (onError)
                {
                    onError("No eclipse elements found in javascript file.");
                }
            }
        }	
        else
        {
            if (onError)
            {
                onError(status);
            }
        }
    };
    
    /*
     * Parse a catalog date string into a JavaScript Date object.
     * Returns JavaScript Date Object
     * @param {String} cat_date_str
     * @returns {Date}
     */
    this.parseCatDate = function(cat_date_str)
    {
        var year = "";
        var month_day = "";
        var time_str = "";
        
        year = cat_date_str.substr(0, 4);
        month_day = cat_date_str.substr(5, 6);
        time_str = cat_date_str.substr(13, 9);
        
        var new_date_str = month_day + ", " + year + " " + time_str + " GMT";
        
        return new Date(new_date_str);
    };
    
    /* onLoadCatalog(data, status, onComplete, onError)
     * Called after catalog data is ajax loaded.
     * data: object of loaded data
     * status: String of load status
     * onComplete: optional function() call on completion of load
     * onError: optional function() call on error loading data.
     */
    this.onLoadCatalog = function(data, status, onComplete, onError)
    {
        console.log("Loading cat");
        if (status == "success")
        {
            var cat_lines = data.match(/[^\r\n]+/g);	// Retrieve each non-empty line into an array.
            var lastCatIndex = 0;
            
            for (var e = 0; e < this.getEclipseCount(); e++)
            {
                for (var i = lastCatIndex; i < cat_lines.length; i++)   // Eclipses should be found in order, since they are in order in the catalog.
                {
                    
                    if (cat_lines[i].length == VALID_LINE_LENGTH)
                    {
                        var eclipse_date = this.parseCatDate(cat_lines[i].substr(DATE_START_IDX, DATE_STRING_LENGTH));
                        if (!isNaN(eclipse_date.getTime()))	// Making sure we have a valid date.
                        {
                            if (cat_lines[i][DATE_START_IDX] == "-")		// If year is negative, we must do this manually.
                            {
                                eclipse_date.setUTCFullYear((-1) * eclipse_date.getUTCFullYear());
                            }
                            
                            if (this.isTimeClose(eclipse_date, this.getEclipse(e).maxEclipseDate))
                            {
                                this.setEclipseMidPoint(cat_lines[i], e);
                                this.setEclipseType(cat_lines[i], e);
                                break;
                            }
                        }
                        else
                        {
                            console.log("Unable to parse date catalog line: " + i);
                        }
                    }
                }
                lastCatIndex = i;
            }
            
            if (onComplete)
            {
                onComplete();
            }
        }
        else
        {
            if (onError)
            {
                onError();
            }
        }
        
        data = null;
    };
    
    /* loadEclipseElements(besselian_url, onComplete, onError)
     * Load eclipse elements into object.
     * besselian_url: Javascript file containing eclipse Besselian elements (required)
     * catalog_url: text file containing eclipse data (required).
     * onComplete: function() executed on successful data load (optional).
     * onError: function(msg) executed on load error msg: status message (optional).
     */
    this.loadEclipseElements = function(besselian_url, catalog_url, onComplete, onError)
    {
        var proxied = $.proxy(function(response, status)
        {
            this.onLoadBesselian(status, this.loadEclipseCatalog(catalog_url, onComplete, onError), onError);
        }, this);
        
        $.getScript(besselian_url, proxied);	
    };
    
    /*
     * loadEclipseCatalog(catalog_url, onComplete, onError)
     * Loads catalog data into this object.  Called by loadEclipseElements
     * catalog_url: String url of catalog text file
     * onComplete: optional function() executed on successful complete of catalog load
     * onError: optional function() executed on error loading catalog data.
     */
    this.loadEclipseCatalog = function(catalog_url, onComplete, onError)
    {
        var proxied = $.proxy(function(data, status)
        {
            this.onLoadCatalog(data, status, onComplete, onError);
        }, this);
        
        /***
        var proxy_error = $.proxy(onError, this);

        $.ajax(
                {
                    url: catalog_url,
                    dataType: "html"
                }).done(proxied)
                        .fail(proxy_error);
        ***/
       
        $.get(catalog_url, proxied);
    };
    
    // Set the midpoint of the eclipse from catalog data
    // cat_line: required string of catalog line for eclipse
    // eclipseNumber: required number of eclipse we are getting midpoint for.
    this.setEclipseMidPoint = function(cat_line, eclipseNumber)
    {
        if (eclipseNumber >= 0 && eclipseNumber < this.getEclipseCount())
        {
            var lat = parseFloat(cat_line.substr(LAT_START_IDX, LAT_LENGTH));
            var longi = parseFloat(cat_line.substr(LONG_START_IDX, LONG_LENGTH));
            
            // South is negative latitude.
            if (cat_line[LAT_START_IDX + LAT_LENGTH] == 'S')
            {
                lat *= (-1.0);
            }
            
            // West is negative longitude;
            if (cat_line[LONG_START_IDX + LONG_LENGTH] == 'W')
            {
                longi *= (-1.0);
            }
            
            this.getEclipse(eclipseNumber).midEclipsePoint.setPosition(lat, longi);
        }
    };
    
    // Set the eclipse type from catalog data.
    // cat_line: required string of catalog line for eclipse
    // eclipseNumber: required number of eclipse we are getting type for.
    this.setEclipseType = function(cat_line, eclipseNumber)
    {
        if (eclipseNumber >= 0 && eclipseNumber < this.getEclipseCount())
        {
            switch (cat_line[ECLIPSE_TYPE_IDX])
            {
                case 'P':
                    this.getEclipse(eclipseNumber).type = "Partial";
                    break;
                    
                case 'A':
                    this.getEclipse(eclipseNumber).type = "Annular";
                    break;
                    
                case 'T':
                    this.getEclipse(eclipseNumber).type = "Total";
                    break;
                    
                case 'H':
                    this.getEclipse(eclipseNumber).type = "Hybrid";
                    break;
                    
                default:
                    console.log("No eclipse type found.");
                    break;									
            }
        }
    };
    
    /*
     * Sorts eclipses by Julian Day.
     * Smallest Julian Day is first.
     */
    this.sortEclipses = function()
    {
        this.eclipseArray.sort(function(eclipse_1, eclipse_2)
        {
            return(eclipse_1.maxEclipseDate.getTime() - eclipse_2.maxEclipseDate.getTime());
        });
    };
}
