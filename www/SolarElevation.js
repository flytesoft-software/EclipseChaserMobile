/*
 * SolarElevation.js
 * author: Joshua Berlin
 * Calculates solar elevation in degrees from given, latitude, longitude, and time.
 * 7-19-2014 B
 * */

/*
 * Makes sure value is inside circle 360.0 degrees!
 * @param {Number} value
 * @returns {Number}
 */
function rev(/* Number */ value)
{
    if (value > 360.0 || value < 0.0)
    {
        return (value - (Math.floor(value / 360.0) * 360.0));
    }

    return value;
}

// Helper functions:
function radToDeg(angleRad)
{
    return (180.0 * angleRad / Math.PI);
}

function degToRad(angleDeg)
{
    return (Math.PI * angleDeg / 180.0);
}

function calcGeomMeanLongSun(t)
{
    var L0 = 280.46646 + t * (36000.76983 + t * (0.0003032));

    return rev(L0);
}

function calcMeanObliquityOfEcliptic(t)
{
    var seconds = 21.448 - t * (46.8150 + t * (0.00059 - t * (0.001813)));
    var e0 = 23.0 + (26.0 + (seconds / 60.0)) / 60.0;

    return e0;		// in degrees
}

function calcObliquityCorrection(t)
{
    var e0 = calcMeanObliquityOfEcliptic(t);
    var omega = 125.04 - 1934.136 * t;
    var e = e0 + 0.00256 * Math.cos(degToRad(omega));

    return e;		// in degrees
}

function calcEccentricityEarthOrbit(t)
{
    var e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

    return e;		// unitless
}

function calcGeomMeanAnomalySun(t)
{
    var M = 357.52911 + t * (35999.05029 - 0.0001537 * t);

    return M;		// in degrees
}

function calcEquationOfTime(t)
{
    var epsilon = calcObliquityCorrection(t);
    var l0 = calcGeomMeanLongSun(t);
    var e = calcEccentricityEarthOrbit(t);
    var m = calcGeomMeanAnomalySun(t);
    var y = Math.tan(degToRad(epsilon) / 2.0);
    y *= y;

    var sin2l0 = Math.sin(2.0 * degToRad(l0));
    var sinm = Math.sin(degToRad(m));
    var cos2l0 = Math.cos(2.0 * degToRad(l0));
    var sin4l0 = Math.sin(4.0 * degToRad(l0));
    var sin2m = Math.sin(2.0 * degToRad(m));

    var Etime = y * sin2l0 - 2.0 * e * sinm + 4.0 * e * y * sinm * cos2l0 - 0.5 * y * y * sin4l0 - 1.25 * e * e * sin2m;

    return (radToDeg(Etime) * 4.0);	// in minutes of time
}

function calcTimeJulianCent(jd)
{
    return ((jd - 2451545.0) / 36525.0);
}

function getJD(time)
{
    var month = time.getUTCMonth() + 1;
    var day = time.getUTCDate();
    var year = time.getUTCFullYear();
    var hours = time.getUTCHours();
    var minutes = time.getUTCMinutes();
    var seconds = time.getUTCSeconds();

    if (month <= 2)
    {
        year -= 1;
        month += 12;
    }

    var A = Math.floor(year / 100);
    var B = 2 - A + Math.floor(A / 4);
    var JD = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;

    JD += hours / 24.0;
    JD += minutes / (24.0 * 60.0);
    JD += seconds / (24.0 * 60.0 * 60);

    return JD;
}


// Gets solar hour angle from javaScript date object
function getHourAngle(longitude, time, timeZone)
{
    var jday = getJD(time);
    var virtualTz = longitude / 15;
    if (virtualTz < 0)
    {
        virtualTz = Math.ceil(virtualTz);
    }
    else
    {
        virtualTz = Math.floor(virtualTz);
    }
    var local_hours = time.getUTCHours() + virtualTz;
    if (local_hours < 0)
    {
        local_hours += 24;
    }
    if (local_hours > 24)
    {
        local_hours -= 24;
    }
    var local_minutes = local_hours * 60 + time.getUTCMinutes();

    var T = calcTimeJulianCent(jday);
    var eqTime = calcEquationOfTime(T);
    var solarTimeFix = eqTime + 4.0 * (longitude % 15);	// Standard world timezone, every 15 degrees.
    var trueSolarTime = local_minutes + solarTimeFix;

    if (trueSolarTime > 1440)
    {
        trueSolarTime -= 1440;
    }
    if (trueSolarTime < -1440)
    {
        trueSolarTime += 1440;
    }

    var hourAngle = trueSolarTime / 4.0 - 180.0;
    if (hourAngle < -180.0)
    {
        hourAngle += 360.0;
    }
    if (hourAngle > 180.0)
    {
        hourAngle -= 360.0;
    }

    var haRad = degToRad(hourAngle);

    return haRad;
}

/*
 * Calculates hour angle in radians given latidue and solar declination input in radians.
 * Returns NaN if no sunrise or sunset
 * Possible divide by zero, TODO: Keep this from happening, not good coding!
 */
function calcHourAngleSunrise(lat, solarDec)
{
    var latRad = degToRad(lat);
    var sdRad = solarDec;
    var HAarg = (Math.cos(degToRad(90.833)) / (Math.cos(latRad) * Math.cos(sdRad)) - Math.tan(latRad) * Math.tan(sdRad));
    var HA = Math.acos(HAarg);

    return HA;		// in radians (for sunset, use -HA)
}

/*
 * Calculates sunrise and sunset time for a given location
 * Input rise: true: sunrise, else sunset
 * time: JavaScript Date Object
 * Latitude in degrees: North is positive
 * Longitude in degrees: West is negative.
 * Returns JavaScript Date Object.
 * Returns null if sun does not rise or set!
 */

function calcSunriseSetUTC(rise, time, latitude, longitude)
{
    var sunTime = new Date(time);

    sunTime.setUTCHours(0);		// Going to UTC midnight for specified day.
    sunTime.setUTCMinutes(0);
    sunTime.setUTCSeconds(0);
    sunTime.setUTCMilliseconds(0);

    var JD = getJD(sunTime);
    var t = calcTimeJulianCent(JD);
    var eqTime = calcEquationOfTime(t);
    var solarDec = getSolarDeclination(time);
    var hourAngle = calcHourAngleSunrise(latitude, solarDec);

    if (!isNaN(hourAngle))
    {
        if (!rise)
            hourAngle = -hourAngle;
        var delta = longitude + radToDeg(hourAngle);
        var deltaMinutes = 720 - (4.0 * delta) - eqTime;	// in minute
        var deltaSeconds = Math.round((deltaMinutes - Math.floor(deltaMinutes)) * 60);
        deltaMinutes = Math.floor(deltaMinutes);
        sunTime.setUTCMinutes(sunTime.getUTCMinutes() + deltaMinutes);
        sunTime.setUTCSeconds(sunTime.getUTCSeconds() + deltaSeconds);

        return sunTime;
    }

    return null;
}

/*
 * Returns the solar declination in radians
 * according to input of JavaScript date object.
 */
function getSolarDeclination(time)
{
    var lastNewYears = new Date(time);
    var daysSinceNewYears = 0.0;
    var solarDeclination = 0.0;

    lastNewYears.setUTCMonth(0);
    lastNewYears.setUTCDate(1);
    lastNewYears.setUTCHours(0);
    lastNewYears.setUTCMinutes(0);
    lastNewYears.setUTCSeconds(0);
    lastNewYears.setUTCMilliseconds(0);

    daysSinceNewYears = (time.getTime() - lastNewYears.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceNewYears == 2.0)	// Protects a divide by zero situation.
    {
        daysSinceNewYears += 0.000001;
    }

    solarDeclination = Math.asin(Math.sin(degToRad(-23.44)) * Math.cos(degToRad(360) / 365.24 * (daysSinceNewYears + 10) + degToRad(360) / Math.PI * 0.0167 * Math.sin(degToRad(360) / 365.24 * (daysSinceNewYears - 2))));

    return solarDeclination;
}

/*
 * Input latitude: required number North is positive, south is negative
 * Input longitude: West is negative.
 * Input time: required, JavaScript Date object
 */
function getSolarElevation(latitude, longitude, time)
{
    var solarElev = 0.0;
    var latRads = degToRad(latitude);
    var hourAngle = getHourAngle(longitude, time);
    var solarDeclination = getSolarDeclination(time);

    solarElev = Math.asin(Math.cos(hourAngle) * Math.cos(solarDeclination) * Math.cos(latRads) + Math.sin(solarDeclination) * Math.sin(latRads));

    solarElev = radToDeg(solarElev);

    return solarElev;
}