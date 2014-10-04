/* 
 * plantetpostions.js
 * Obtaining postions of the planets in the sky for a given, lat, long, date object.
 * Doing just the Sun and Moon first.
 * Author: Joshua Berlin
 * Last Edited: 10-01-2014
 */

/* This object does "simple" 
 * Calculations using Keplerian elements
 * Formulas adapted from
 * Paul Schlyter, Stockholm, Sweden
 * http://stjarnhimlen.se/
 * Modified, corrected, and javaScripted by Joshua Berlin.
 * @returns {PlanetPositions}
 */
function PlanetPositions()
{
    var SOLAR_DIAMETER = 1392684;   // In kilometers
    var ASTRO_UNIT = 149597871.0;   // Astronomical Unit in kilometers.
    var MAX_ITERATIONS = 50;        // Max iterations for eccentric anomaly calculation.
    var GOOD_CALC = 0.000000001;    // Good calculation for eccentric anomaly.
    var LUNAR_DIAMETER = 3474.2;    // In kilometers.
    var EARTH_RADIUS = 6371.0;      // In kilometers.
    
    function radToDeg(angleRad) 
    {
        if(isNaN(angleRad))
        {
            return 0.0;
        }
        return (180.0 * angleRad / Math.PI);
    }

    function degToRad(angleDeg) 
    {
        if(isNaN(angleDeg))
        {
            return 0.0;
        }
        return (Math.PI * angleDeg / 180.0);
    }
    
    function sin(/* Number */ deg)
    {
        var ans = Math.sin(degToRad(deg));
        if(isNaN(ans))
        {
            return 0.0;
        }
        return ans;
    }
    
    function cos(/* Number */ deg)
    {
        var ans = Math.cos(degToRad(deg));
        if(isNaN(ans))
        {
            return 0.0;
        }
        return ans;
    }
    
    function tan(/* Number */ deg)
    {
        var ans = Math.tan(degToRad(deg));
        if(isNaN(ans))
        {
            return 0.0;
        }
        return ans;
    }
    
    function acos(/* Number */ deg)
    {
        var ans = Math.acos(degToRad(deg));
        if(isNaN(ans))
        {
            return 0.0;
        }
        return ans;
    }
    
    function atan(/* Number */ x)
    {
        return radToDeg(Math.atan(x));
    }
    
    function atan2(/* Number */y, /* Number */ x)
    {
        return radToDeg(Math.atan2(y, x));
    }
    
    function sqrt(/* Number */ num)
    {
        return Math.sqrt(Math.abs(num));
    }
    
    /*
     * Input distance to object, gets parallax in degrees.
     * @param {Number} km
     * @returns {Number} parallax in degrees
     */
    function getPlanetParallax(/* Number */ km)
    {
        return (8.794/3600) / (kmtoAU(km));
    }
    
    /*
     * Converts kilometers to astronomical units.
     * @param {Number} km
     * @returns {Number} Astronomical Units
     */
    function kmtoAU(/* Number */ km)
    {
        return km / ASTRO_UNIT;
    }
 
    /* Returns the current epoch day from
     * javaScript date object
     * @param {Date} date
     * @returns {Number}
     */
    function getEpochDay(/* Date */ date)
    {
        var epochDate = new Date(Date.UTC(2000, 0, 0, 0, 0, 0));
        var deltaTime = date.getTime() - epochDate.getTime();
     
        deltaTime /= 86400000.0;
        
        return deltaTime;
    }
    
    /*
     * Makes sure value is inside circle 360.0 degrees!
     * @param {Number} value
     * @returns {Number}
     */
    function rev(/* Number */ value)
    {
        if(value > 360.0 || value < 0.0)
        {
            return (value - (Math.floor(value / 360.0) * 360.0));
        }
        
        return value;
    }
    
    function getDecl(/* Number */ x, /* Number */ y, /* Number */ z)
    {
        var decl = atan2( z, sqrt( x * x + y * y ) );
        
        if(isNaN(decl))
        {
            decl = 0.0;
        }
        
        return decl;
    }
    
    function getRA(xequat, yequat)
    {
        var RA = atan2(yequat, xequat);
        if(isNaN(RA))
        {
            RA = 0.0;
        }
        
        return rev(RA);
    }
    
    function getTopRADecl(HA, RA, decl, km, lat)
    {
         var ppar = getPlanetParallax(km);
        
        // Altitude correction here.
        // var alt_topoc = alt_geoc - ppar * cos(alt_geoc);
        
        // TODO: Check exact flattening of Earth.
        var gclat = lat - 0.1924 * sin(2 * lat);
        var rho = 0.99833 + 0.00167 * cos(2 * lat);
        var g = atan2( tan(gclat), cos(HA) ); // Aux Angle.
        
        var correct_ra = ppar * rho * cos(gclat) * sin(HA) / cos(decl);
        if(isNaN(correct_ra))
        {
            correct_ra = 0.0;
        }
        var correct_decl =  ppar * rho * sin(gclat) * sin(g - decl) / sin(g);
        
        if(isNaN(correct_decl))
        {
            correct_decl = 0.0;
        }
        
        var topRA = RA - correct_ra;
        var topDecl = decl - correct_decl;
        
        return {
            top_ra: topRA,
            top_decl: topDecl
        };
    }
    
    // N
    function getLunarAscendingNode(/* Number */ day)
    {
        var N = 125.1228 - 0.0529538083 * day;
        
        return rev(N);
    }
    
    // i
    function getLunarInclination(/* Number */ day)
    {
        var i = 5.1454;
        
        return i;
    }
    
    // w
    function getLunarArgPerigee(/* Number */ day)
    {
        var w = 318.0634 + 0.1643573223 * day;
        
        return rev(w);
    }
    
    // a
    function getLunarMeanDistance(/* Number */ day)
    {
        // var a = 60.2666; // Earth radii
        var a = 385000; // in KM
        
        return a;
    }
    
    // e
    function getLunarEccentricity(/* Number */ day)
    {
        var e = 0.054900;
        
        return e;
    }
    
    // M
    function getLunarMeanAnomaly(/* Number */ day)
    {
        var M = 115.3654 + 13.0649929509 * day;
        
        return rev(M);
    }
    
    // N
    function getSolarAscendingNode()
    {
        return 0.0;
    }
    
    // i
    function getSolarInclination()
    {
        return 0.0;
    }
    
    function getSolarArgPerihelion(day)
    {
        return rev((282.9404 + 4.70935E-5 * day));
    }
    
    // a
    function getSolarSemiMajorAxis()
    {
        return 149598261;
    }
    
    function getSolarEccentricity(day)
    {
        return (0.016709 - 1.151E-9 * day);
    }
    
    function getSolarMeanAnomaly(day)
    {      
        return rev(356.0470 + 0.9856002585 * day);
    }
    
    // W
    function getMeanLong(/* Number */ w, /* Numer */ M)
    {
        return rev(w + M);
    }
    
    // oblec
    function getEarthOblec(day)
    {
        return rev(23.4393 - 3.563E-7 * day);
    }
    
    // E
    function getEccentricAnomaly(/* Number */ M, /* Number */ e )
    {
        var E = M + (180.0 / Math.PI) * e * sin(M) * (1.0 + e * cos(M));
        var old_E = E;
        
        for(i = 0; i < MAX_ITERATIONS; i++)
        {
           old_E = E; 
           E = E - ( E - e * (180.0 / Math.PI) * sin(E) - M ) / ( 1.0 - e * cos(E) );
           if(Math.abs(old_E - E) < GOOD_CALC)
           {
               break;
           }
        }
        if(i == MAX_ITERATIONS)
        {
            console.log("Went to max iterations.");
        }
        
        return rev(E);
    }
    
    function getOrbitalCoords(/* Number */ a, /* Number */ E, /* Number */ e)
    {
        var x = a * (cos(E) - e);
        var y = a * sin(E) * sqrt(1.0 - e * e);
        var z = 0.0;    // Not sure about the formula for this yet.
        
        return{
            "x": x,
            "y": y,
            "z": z
        };
    }
    
    // Special for Sun, since its on the ecliptic!
    function getSolarEclipticCoords(/* Number */ x_orb, /* Number */ y_orb)
    {
        var x = x_orb;
        var y = y_orb;
        var z = 0.0;
        
        return{
            "x": x,
            "y": y,
            "z": z
        };
    }
   
    // r
    function getDistance(x, y, z)
    {
        var r = sqrt(x * x + y * y + z * z);
        
        return r;
    }
    
    // v
    function getTrueAnomaly(x, y)
    {
        var v = rev(atan2( y, x ));
        
        return v;
    }
    
    // lon
    function getLongitude(v, w)
    {
        var lon = rev(v + w);
        
        return lon;
    }
    
    function getEquatorialCoords(oblec, r, lon, z)
    {
        var xequat = r * cos(lon);
        
        var yequat = r * sin(lon) * cos(oblec) - z * sin(oblec);
        var zequat = r * sin(lon) * sin(oblec) + z * cos(oblec);
        
        return {
            "x": xequat,
            "y": yequat,
            "z": zequat
        };
       
    }
    
    function getSolarSiderealAngle(day, longitude, L)
    {
        var utc_hours = 0.0;
        
        if(day >= 0.0)
        {
            utc_hours = 24.0 * (day - Math.floor(day));
        }
        else
        {
            utc_hours = 24.0 * (1 + (day - Math.ceil(day)));
        }
        
        if(utc_hours >= 24.0)
        {
            utc_hours -= 24.0;
        }
        
        var sideAngle = L + 180.0 + longitude + (utc_hours * 15.0);
        sideAngle = rev(sideAngle);
        
        return sideAngle;
    }
    
    function getSolarSiderealTime(day, longitude, L)
    {
       var sideTime = getSolarSiderealAngle(day, longitude, L) / 15.0;
       
       return sideTime;
    }
    
    function getHourAngle(sideAngle, RA)
    {
        return rev(sideAngle - RA);
    }
    
    /*
     * Calculates the apparent angular size of object
     * @diameter {Number} diameter of object in Kilometers
     * @distance {Number} distance to object in Kilometers
     * @returns {Number} radians: apparent size of Sun
     */
    function getAngularDiameter(/* Number */ diameter, /* Number */ distance)
    {
        return (2 * atan2(diameter, (2 * distance)));
    }
    
    /*
     * Returns the altitude and azimuth for object
     * @param {Number} HA - Hour angle
     * @param {Number} decl - Topospheric? declination
     * @param {Number} lat - latitude
     * @returns {Object}
     */
    function getAltEl(/* Number */ hourAngle, /* Number */ decl, /* Number */ latitude)
    {
        var x = cos(hourAngle) * cos(decl);
        var yhor = sin(hourAngle) * cos(decl);
        var z = sin(decl);
        var xhor = x * cos(90.0 - latitude) - z * sin(90.0 - latitude);
        var zhor = x * sin(90.0 - latitude) + z * cos(90.0 - latitude);
        
        var azimuth = atan2( yhor, xhor ) + 180.0;
        var elevation = atan2( zhor, sqrt(xhor * xhor + yhor * yhor) );
        
        return{
            "azimuth": azimuth,
            "elevation": elevation
        };
    }
    
    /*
     * Returns the ecliptic coords of object.
     * @parma {Number} r - Distance to object in orbit.
     * @param {Number} N - Longitude of Ascending Node
     * @param {Number} lon - Longitude in orbit
     * @param {Number} i - inclination
     * @returns {Object}
     */
    function getEclipticCoords(/* Number*/ r, /* Number */ N, /* Number */ lon, /* Number */ i)
    {
        var xeclip = r * ( cos(N) * cos(lon) - sin(N) * sin(lon) * cos(i) );
        var yeclip = r * ( sin(N) * cos(lon) + cos(N) * sin(lon) * cos(i) );
        var zeclip = r * sin(lon) * sin(i);
        
        return{
            "x": xeclip,
            "y": yeclip,
            "z": zeclip
        };
    }
    
    /* Input ecliptic x, y, z object
     * Converts to lat long coordinates.
     * @param {Object} ecliptic
     * @returns {Object}
     */
    function eclipiticToLatLon(/* Object */ ecliptic)
    {
        var lonecl = atan2( ecliptic.y, ecliptic.x );
        var latecl = atan2( ecliptic.z, sqrt(ecliptic.x * ecliptic.x + ecliptic.y * ecliptic.y) );
        
        return {
            "lat": latecl,
            "lon": rev(lonecl)
        };
    }
    
    /*
     * Input latitude, longitude, and radius to object to convert to ecliptic coords
     * @param {Number} lat
     * @param {Number} lon
     * @param {Number} r
     * @returns {Object}
     */
    function latLonToEcliptic(/* Number */ lat, /* Number */ lon, /* Number */ r)
    {
        var xg = r * cos(lon) * cos(lat);
        var yg = r * sin(lon) * cos(lat);
        var zg = r * sin(lat);
        
        return {
          "x": xg,
          "y": yg,
          "z": zg
        };
    }
    
    /*
     * Returns equatorial coords from geo-centric ecliptic coords
     * @param {Number} oblec - Obliquity to the ecliptic
     * @param {Object} ecliptic - Ecliptic coordinates object.
     * @returns {Object}
     */
    function getEquaFromEcliptic(/* Number */ oblec, /* Object */ ecliptic)
    {
        var xe = ecliptic.x;
        var ye = ecliptic.y * cos(oblec) - ecliptic.z * sin(oblec);
        var ze = ecliptic.y * sin(oblec) + ecliptic.z * cos(oblec);
        
        return {
            "x": xe,
            "y": ye,
            "z": ze
        };
    }
    
    /* Return lunar perturbation correction in longitude degrees 
     * @param {Number} M
     * @param {Number} D
     * @param {Number} sunM
     * @returns {Number}
     */
    function lunarPerturbationLon(/* Number */ M, /* Number */ D, /* Number */ sunM, /* Number */ F)
    {
        var lon_correct = 0.0;
        
        lon_correct += -1.274 * sin(M - 2 * D);  // (Evection)
        lon_correct += 0.658 * sin(2 * D);      // (Variation)
        lon_correct += -0.186 * sin(sunM);      // (Yearly equation)
        lon_correct += -0.059 * sin(2 * M - 2 * D);
        lon_correct += -0.057 * sin(M - 2 * D + sunM);
        lon_correct += 0.053 * sin(M + 2 * D);
        lon_correct += 0.046 * sin(2 * D - sunM);
        lon_correct += 0.041 * sin(M - sunM);
        lon_correct += -0.035 * sin(D);         // (Parallactic equation)
        lon_correct += -0.031 * sin(M + sunM);
        lon_correct += -0.015 * sin(2 * F - 2 * D);
        lon_correct += +0.011 * sin(M - 4 * D);
    
        return lon_correct;
    }
    
    /* Return lunar perturbation correction in latitude degrees 
     * @param {Number} M
     * @param {Number} D
     * @param {Number} sunM
     * @returns {Number}
     */
    function lunarPerturbationLat(/* Number */ M, /* Number */ D, /* Number */ F)
    {
        var lat_correct = 0.0;
        
        lat_correct += -0.173 * sin(F - 2 * D);
        lat_correct += -0.055 * sin(M - F - 2 * D);
        lat_correct += -0.046 * sin(M + F - 2 * D);
        lat_correct += +0.033 * sin(F + 2 * D);
        lat_correct += +0.017 * sin(2 * M + F);
    
        return lat_correct;
    }
    
     /* Return lunar perturbation correction in distance in Earth radii 
     * @param {Number} M
     * @param {Number} D
     * @param {Number} sunM
     * @returns {Number}
     */
    function lunarPerturbationDist(/* Number */ M, /* Number */ D)
    {
        var dist_correct = 0.0;
        
        dist_correct += -0.58 * cos(M - 2 * D);
        dist_correct += -0.46 * cos(2 * D);
    
        return (dist_correct * EARTH_RADIUS);  // To convert to kilometers
    }
    
    /*
     * Returns Moon's postion in the sky for specified date, latitude, and longitude
     * @param {Date} date
     * @param {Number} latitude
     * @param {Number} longitude
     * @returns {Object} Moon position data
     */
    this.getMoonPosition = function(/* Date */ date, /* Number */ latitude, /* latitude */ longitude)
    {
        var day = getEpochDay(date);
        var oblec = getEarthOblec(day);
        var N = getLunarAscendingNode(day);
        var i = getLunarInclination(day);
        var w = getLunarArgPerigee(day);
        var a = getLunarMeanDistance(day);
        var e = getLunarEccentricity(day);
        var M = getLunarMeanAnomaly(day);
        var E = getEccentricAnomaly(M, e);
        var moonOrbCoords = getOrbitalCoords(a, E, e);
        var r = getDistance(moonOrbCoords.x,
                            moonOrbCoords.y,
                            moonOrbCoords.z);
        var v = getTrueAnomaly(moonOrbCoords.x, moonOrbCoords.y);
        var lon = getLongitude(v, w);
        var moonEclipCoords = getEclipticCoords(r, N, lon, i);
        var moonEclipLatLon =  eclipiticToLatLon(moonEclipCoords);
        
        var moonL = rev(N + w + M);
        
        var sun_w = getSolarArgPerihelion(day);
        var sunM = getSolarMeanAnomaly(day);
        var sunL = getMeanLong(sun_w, sunM);
        
        var D = rev(moonL - sunL);
        var F = rev(moonL - N);
        
        var lon_correct = lunarPerturbationLon(M, D, sunM, F);
        var lat_correct = lunarPerturbationLat(M, D, F);
        var dist_correct = lunarPerturbationDist(M, D);
        
        var newEclipCoords = latLonToEcliptic(  moonEclipLatLon.lat + lat_correct, 
                                                moonEclipLatLon.lon + lon_correct,
                                                r + dist_correct);
                                                
        var moonEquaCoords = getEquaFromEcliptic(oblec, newEclipCoords);
         
        var RA = getRA(moonEquaCoords.x, moonEquaCoords.y);
        var decl = getDecl(moonEquaCoords.x, moonEquaCoords.y, moonEquaCoords.z);
        
        var solarSiderealAngle = getSolarSiderealAngle(day, longitude, sunL);
        var lunarHourAngle = rev(solarSiderealAngle - RA);
        
        var lunarTopRADecl = getTopRADecl(lunarHourAngle, RA, decl, r + dist_correct, latitude);
        var altEl = getAltEl(lunarHourAngle, lunarTopRADecl.top_decl, latitude);
        
        var angularDiamter = getAngularDiameter(LUNAR_DIAMETER, r + dist_correct );
        
        return {
            "ra": lunarTopRADecl.top_ra,
            "decl": lunarTopRADecl.top_decl,
            "elevation": altEl.elevation,
            "azimuth": altEl.azimuth,
            "diameter": angularDiamter  
        };
    };
    
    /*
     * Returns Sun's postion in the sky for specified date, latitude, and longitude
     * @param {Date} date
     * @param {Number} latitude
     * @param {Number} longitude
     * @returns {Object} Solar position data
     */
    this.getSunPosition = function(/* Date */ date, /* Number */ latitude, /* latitude */ longitude)
    {
        var day = getEpochDay(date);
        var oblec = getEarthOblec(day);
        var sun_w = getSolarArgPerihelion(day);
        var sun_a = getSolarSemiMajorAxis(day);
        var sun_e = getSolarEccentricity(day);
        var sunM = getSolarMeanAnomaly(day);
        var sunL = getMeanLong(sun_w, sunM);
        var sunE = getEccentricAnomaly(sunM, sun_e);
        var sunOrbCoords = getOrbitalCoords(sun_a, sunE, sun_e);
        var sunEclipticCoords = getSolarEclipticCoords(sunOrbCoords.x, sunOrbCoords.y);
        var sunR = getDistance( sunEclipticCoords.x,
                                sunEclipticCoords.y,
                                sunEclipticCoords.z);
        var sunV = getTrueAnomaly(sunEclipticCoords.x, sunEclipticCoords.y);
        var sunLong = getLongitude(sunV, sun_w);
        var sunEquatorialCoords = getEquatorialCoords(  oblec,
                                                        sunR,
                                                        sunLong,
                                                        sunEclipticCoords.z);
        var sunRA = getRA(sunEquatorialCoords.x, sunEquatorialCoords.y);
        var sunDECL = getDecl(sunEquatorialCoords.x,
                                sunEquatorialCoords.y,
                                sunEquatorialCoords.z);
        
        var hourAngle = getHourAngle(getSolarSiderealAngle(day, longitude, sunL), sunRA);
        var sunTopRADecl = getTopRADecl(hourAngle, sunRA, sunDECL, sunR, latitude);
        
        var angularDiamter = getAngularDiameter(SOLAR_DIAMETER, sunR );
        
        var sunAltEl = getAltEl(hourAngle, sunTopRADecl.top_decl, latitude);
        
        return {
            "ra": sunTopRADecl.top_ra,
            "decl": sunTopRADecl.top_decl,
            "elevation": sunAltEl.elevation,
            "azimuth": sunAltEl.azimuth,
            "diameter": angularDiamter            
        };
    };
}

/*
 * More accurate  Planet position calculator...
 * But much slower.
 * Uses VSOP87D for the Sun's position
 * Uses ELP-2000-82 For the Moon's position.
 * Uses Delta T Polynomial from Espenak and Meeus
 * Uses IAU2000B Nutation calculations
 * Light time corrections for Sun
 * Requires earth_vsop_d.js
 * TODO: Still not perfect!
 * @returns {PlanetPositionsAC}
 */
function PlanetPositionsAC()
{
    var date = null; // Date being used by calculations.
    var day = 0; // Days since Jan 1st, 2000 0000UTC corrected for DeltaT
    var T = 0.0;  // Number of centuries before or after J2000.0 Epoch.
    var T2 = 0.0;
    var T3 = 0.0;
    var T4 = 0.0;
    var oblec =  0.0; // Obliquity of Earth.
    var N = 0.0;    // Lunar acsending node.
    var M =  0.0;   // Lunar mean anomaly.
    var E =  0.0;   // Earth eccentriy argument for Moon.
    var E2 = 0.0;   // E squared.
    var F =  0.0;   // Lunar arg of latitude.
    var D =  0.0;   // Lunar mean elongation.
    var L = 0.0;    // Lunar mean longitude.
    var sunM = 0.0; // Solar mean anomaly.
    var A1 = 0.0;   // Argument of Venus
    var A2 = 0.0;   // Arugment of Jupiter
    var A3 = 0.0;   // Third lunar argument.
    var dLongNutation = 0.0;    // Nutation correction in ecliptic longitude.
    
    var J2000_OBLEC = 23.4392911;    // Obliquity at the J2000 Epoch. For later use?
    var SOLAR_DIAMETER = 1392000;   // In kilometers
    var ASTRO_UNIT = 149597871.0;   // Astronomical Unit in kilometers.
    var SPEED_OF_LIGHT = 299792.458;    // In km/s.
    var LUNAR_DIAMETER = 3474.8;    // In kilometers.
    var day_correction = -1.5;      // To get to real J2000 epoch, old day uses different reference frame.
    var deltaT = 0.0;               // Time correction, calculated in seconds but converted to fractions of a day.
    var SOLAR_ABERRATION = 0.00569161111111111111111111111111;  // In degrees. For later use?
        
    function radToDeg(angleRad) 
    {
        if(isNaN(angleRad))
        {
            console.log("RAD NAN");
            return 0.0;
        }
        return (180.0 * angleRad / Math.PI);
    }

    function degToRad(angleDeg) 
    {
        if(isNaN(angleDeg))
        {
            console.log("DEG NAN");
            return 0.0;
        }
        return (Math.PI * angleDeg / 180.0);
    }
    
    function sin(/* Number */ deg)
    {
        var ans = Math.sin(degToRad(deg));
        if(isNaN(ans))
        {
            console.log("SIN NAN");
            return 0.0;
        }
        return ans;
    }
    
    function cos(/* Number */ deg)
    {
        var ans = Math.cos(degToRad(deg));
        if(isNaN(ans))
        {
            console.log("COS NAN");
            return 0.0;
        }
        return ans;
    }
    
    function tan(/* Number */ deg)
    {
        var ans = Math.tan(degToRad(deg));
        if(isNaN(ans))
        {
            console.log("TAN NAN");
            return 0.0;
        }
        return ans;
    }
       
    function atan(/* Number */ x)
    {
        return radToDeg(Math.atan(x));
    }
    
    function acos(/* Number */ val)
    {
        var ans = Math.acos(val);
        if(isNaN(ans))
        {
            console.log("ACOS NAN");
            return 0.0;
        }
        return radToDeg(ans);
    }
    
    function asin(/* Number */ val)
    {
        var ans = Math.asin(val);
        if(isNaN(ans))
        {
            console.log("ASIN NAN");
            return 0.0;
        }
        return radToDeg(ans);
    }
    
    function atan2(/* Number */y, /* Number */ x)
    {
        return radToDeg(Math.atan2(y, x));
    }
    
    function sqrt(/* Number */ num)
    {
        return Math.sqrt(Math.abs(num));
    }
    
    /*
     * Input distance to object, gets parallax in degrees.
     * @param {Number} km
     * @returns {Number} parallax in degrees
     */
    function getPlanetParallax(/* Number */ km)
    {
        return asin(sin(8.79415 / 3600.0) / (kmtoAU(km)));
    }
    
    /*
     * Converts kilometers to astronomical units.
     * @param {Number} km
     * @returns {Number} Astronomical Units
     */
    function kmtoAU(/* Number */ km)
    {
        return km / ASTRO_UNIT;
    }
 
    /* Returns the current epoch day from
     * javaScript date object
     * @param {Date} date
     * @returns {Number}
     */
    function getEpochDay(/* Date */ inDate)
    {
        var epochDate = new Date(Date.UTC(2000, 0, 0, 0, 0, 0));
        var days = inDate.getTime() - epochDate.getTime();
        deltaT = getDeltaT(inDate);
        deltaT /= 86400.0; // deltaT in days;
        
        days /= 86400000.0;
        
        days += deltaT;
          
        return days;
    }
    
    /* Input javaScript Date object
     * Return delta T in seconds
     * @param {Date} date
     * @returns {Number}
     */
    function getDeltaT(/* Date */ date)
    {
        // TODO: Does not work before year 1860, yet!
        var t = 0.0;
        var t2 = 0.0;
        var t3 = 0.0;
        var t4 = 0.0;
        var t5 = 0.0;
        var deltaT = 0.0;
        var years = date.getUTCFullYear();
        var new_years = new Date(Date.UTC(years, 0, 0, 0, 0, 0));
        var sinceNewYears = date.getTime() - new_years.getTime();
        var nextNewYears = new Date(new_years);
        nextNewYears.setUTCFullYear(nextNewYears.getUTCFullYear() + 1);
        sinceNewYears = (sinceNewYears / (nextNewYears.getTime() - new_years.getTime()));
        
        years += sinceNewYears;
        
        if(years < 1900.0)
        {
            t = years - 1860.0;
            t2 = t * t;
            t3 = t2 * t;
            t4 = t3 * t;
            t5 = t4 * t;            
            
            deltaT = 7.62 + 0.5737 * t - 0.251754 * t2 + 0.01680668 * t3 - 0.0004473624 * t4 + t5 / 233174;
        }
        else if(years >= 1900.0 && years < 1920.0)
        {
            t = years - 1900.0;
            t2 = t * t;
            t3 = t2 * t;
            t4 = t3 * t;
            
            deltaT = -2.79 + 1.494119 * t - 0.0598939 * t2 + 0.0061966 * t3 - 0.000197 * t4;
        }
        else if(years >= 1920.0 && years < 1941.0)
        {
            t = years - 1920.0;
            t2 = t * t;
            t3 = t2 * t;
                        
            deltaT = 21.20 + 0.84493 * t - 0.076100 * t2 + 0.0020936 * t3;
        }
        else if(years >= 1941.0 && years < 1961.0)
        {
            t = years - 1950.0;
            t2 = t * t;
            t3 = t2 * t;
                       
            deltaT = 29.07 + 0.407 * t - t2 / 233 + t3 / 2547;
        }
        else if(years >= 1961.0 && years < 1986.0)
        {
            t = years - 1975.0;
            t2 = t * t;
            t3 = t2 * t;
                       
            deltaT = 45.45 + 1.067 * t - t2 / 260 - t3 / 718;
        }
        else if(years >= 1986.0 && years < 2005.0)
        {
            t = years - 2000.0;
            t2 = t * t;
            t3 = t2 * t;
            t4 = t3 * t;
            t5 = t4 * t;
                       
            deltaT = 63.86 + 0.3345 * t - 0.060374 * t2 + 0.0017275 * t3 + 0.000651814 * t4 + 0.00002373599 * t5;
        }
        else if(years >= 2005.0 && years < 2050.0)
        {
            t = years - 2000;
            t2 = t * t;
                       
            deltaT = 62.92 + 0.32217 * t + 0.005589 * t2;
        }
        else if(years >= 2050.0 && years < 2150.0)
        {                       
            deltaT = -20 + 32 * ((years - 1820) / 100) * ((years - 1820) / 100) - 0.5628 * (2150 - years);
        }
        else if(years >= 2150.0)
        {
            t = (years - 1820)/ 100.0;
            
            deltaT = -20 + 32 * t * t;
        }
        
        // small correction needed for lunar secular acceleration?
        if(years < 1955.0 || years > 2005)
        {
            deltaT -= 0.000012932 * (years - 1955.0) * (years - 1955.0);
        }
	        
        return deltaT;
    }
    
    /*
     * Makes sure value is inside circle 360.0 degrees!
     * @param {Number} value
     * @returns {Number}
     */
    function rev(/* Number */ value)
    {
        if(value > 360.0 || value < 0.0)
        {
            return (value - (Math.floor(value / 360.0) * 360.0));
        }
        
        return value;
    }
    
    function getDecl(/* Number */ x, /* Number */ y, /* Number */ z)
    {
        var decl = atan2( z, sqrt( x * x + y * y ) );
        
        if(isNaN(decl))
        {
            decl = 0.0;
        }
        
        return decl;
    }
    
    function getRA(xequat, yequat)
    {
        var RA = atan2(yequat, xequat);
        if(isNaN(RA))
        {
            RA = 0.0;
        }
        
        return rev(RA);
    }
    
    function getTopRADecl(HA, RA, decl, km, lat, elevation)
    {
        var topRA = 0.0;
        var topDecl = 0.0;
        var delta_ra = 0.0;
        var new_decl = 0.0;
        
        var ppar = getPlanetParallax(km);
         
        var U = atan(0.99664719 * tan(lat));
    
        var rhoSinO = 0.99664719 * sin(U) + ((elevation / 6378149.0) * sin(lat));
        var rhoCosO = cos(U) + (elevation / 6378149.0 * cos(lat));
        
        delta_ra = atan2(-rhoCosO * sin(ppar) * sin(HA), cos(decl) - rhoCosO * sin(ppar) * cos(HA));
        new_decl = atan2((sin(decl) - rhoSinO * sin(ppar)) * cos(delta_ra), cos(decl) - rhoCosO * sin(ppar) * cos(HA));
      
        if (isNaN(delta_ra))
        {
            delta_ra = 0.0;
        }

        topRA = rev(RA + delta_ra);

        topDecl = new_decl;
       
        var pi = asin(6378.149 / km);
        var x = cos(topDecl) * sin(HA);
        var y = cos(topDecl) * cos(HA) - rhoCosO * sin(pi);
        var z = sin(topDecl) - rhoSinO * sin(pi);
        var factor = sqrt(x * x + y * y + z * z);
        
        var topR = km * factor;
        
        if(isNaN(topDecl))
        {
            topDecl = decl;
        }
       
        return {
            top_ra: topRA,
            top_decl: topDecl,
            top_dist: topR
        };
    }
    
    // N
    // w3 ??
    function getLunarAscendingNode()
    {
        var node = (450160.398036 - 6962890.5431 * T + 7.4722 * T2  + 0.007702 * T3 - 0.00005939 * T4) / 3600.0;
        node = rev(node);
        
        return node;
    }
    
    // i
    function getLunarInclination()
    {
        var i = 5.1454;
        
        return i;
    }
    
    // w
    function getLunarArgPerigee()
    {
        var w = 318.0634 + 0.1643573223 * day;
        
        return rev(w);
    }
    
    function getLunarMeanLongPerigee()
    {
        var deg = rev(83.3532465 + 4069.0137287 * T - 0.0103200 * T2 - T3/80053.0 + T4/18999000.0);
        
        return deg;
    }
    
    /*
     * Get the lunar argument of latitude
     * returns degrees.
     * F
     * @param {Number} day
     * @returns {Number}
     */
    function getLunarArgLatitude()
    {
        var lat = (335779.526232 + 1739527262.8478 * T - 12.7512 * T2 - 0.001037 * T3 + 0.00000417 * T4) / 3600.0;
        lat = rev(lat);
        
        // var lat = rev(93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3/3526000.0 + T4 / 863310000.0);
        
        return lat;
    }
   
    /* Returns Moon's mean elongation from Sun.
     * In degrees.
     * D
     * @param {Number} day
     * @returns {Number}
     */
    function getLunarMeanElongation()
    {
        var deg = ((1072260.70369 + 1602961601.2090 * T - 6.3706 * T2  + 0.006593 * T3 - 0.00003169 * T4) / 3600.0);
        deg = rev(deg);
        
        return deg;
    }
    
    function getLunarMeanLongitude()
    {
       var deg = rev(218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3/538841.0 - T4/65194000.0);
        
       return deg;
    }
    
    // M
    // l
    function getLunarMeanAnomaly()
    {
        var L = ((485868.249036 + 1717915923.2178 * T + 31.8792 * T2 + 0.051635 * T3 - 0.00024470 * T4) / 3600.0);
        L = rev(L);
        
        return L;
    }
    
    // i
    function getSolarInclination()
    {
        var T = (day + day_correction) / 36525.0;
        
        return (-0.00001531 + -0.01294668 * T); 
    }
    
    function getEarthEccentricity()
    {
        return (1 - 0.002516 * T - 0.0000074 * T2);
    }
    
    function getSolarMeanAnomaly()
    {
        var L = (1287104.79305 + 129596581.0481 * T - 0.5532 * T2 + 0.000136 * T3 - 0.00001149 * T4);
        L /= 3600.0;
        
        return rev(L);
    }
    
    // oblec
    function getEarthOblec(day)
    {
        /***
         * The algorithm used here is based on data published by J. Laskar in
         * Astronomy and Astrophysics, Vol 157, p68 (1986),
         * New Formulas for the Precession, Valid Over 10000 years,
         * Table 8.
         */
        // t is time in DECAMILLENNIA from the epoch.
        
        var t = (day + day_correction) / 3652500.0;
        var w = 84381.448; var p = t;
        w -= 4680.93 * p; p *= t;
        w -= 1.55 * p; p *= t;
        w += 1999.25 * p; p *= t;
        w -= 51.38 * p; p *= t;
        w -= 249.67 * p; p *= t;
        w -= 39.05 * p; p *= t;
        w += 7.12 * p; p *= t;
        w += 27.87 * p; p *= t;
        w += 5.79 * p; p *= t;
        w += 2.45 * p;
        
        w /= 3600.0;
        
        return rev(w);
    }
       
     /*
     * Calculates the locations current solar sidereal angle
     * @param {Number} longitude - Topocentric positional longitude
     * @returns {Number}
     */
    function getSolarSiderealAngle(/* Number */ longitude)
    {
        var correct_day = day - deltaT;
        
        var utc_hours = 0.0;
        
        if(day >= 0.0)
        {
            utc_hours = 24.0 * (correct_day - Math.floor(correct_day));
        }
        else
        {
            utc_hours = 24.0 * (1 + (correct_day - Math.ceil(correct_day)));
        }
        
        if(utc_hours >= 24.0)
        {
            utc_hours -= 24.0;
        }
        
        var deg = rev(100.46061837 + (36000.770053608 * T) + (0.000387933 * T2) - (T3 / 38710000.0));
      
        var newSideAngle = rev(deg + longitude + (utc_hours * 15.0));
       
        return newSideAngle;
    }
    
    /*
     * Calculate's a locations current sidereal time.
     * @param {Number} longitude
     * @returns {Number}
     */
    function getSolarSiderealTime(/* Number */ longitude)
    {
       var sideTime = getSolarSiderealAngle(longitude) / 15.0;
       
       return sideTime;
    }
    
    /* Calculates the hour angle
     * from given RA and sidereal angle.
     * @sideAngle {Number} sideAngle: Object's sidereal angle
     * @RA {Number} RA: Object Right Ascension
     * @returns {Number}
     */
    function getHourAngle(/* Number */ sideAngle, /* Number */ RA)
    {
        return rev(sideAngle - RA);
    }
    
    /*
     * Calculates the apparent angular size of object
     * @diameter {Number} diameter of object in Kilometers
     * @distance {Number} distance to object in Kilometers
     * @returns {Number} radians: apparent size of Sun
     */
    function getAngularDiameter(/* Number */ diameter, /* Number */ distance)
    {
        return (2.0 * atan2(diameter, (2.0 * distance)));
    }
    
    /*
     * Returns the altitude and azimuth for object
     * @param {Number} HA - Hour angle
     * @param {Number} decl - Topospheric declination
     * @param {Number} lat - latitude
     * @returns {Object}
     */
    function getAltEl(/* Number */ hourAngle, /* Number */ decl, /* Number */ latitude)
    {
        var azimuth = rev(atan2(sin(hourAngle), cos(hourAngle) * sin(latitude) - tan(decl) * cos(latitude)) + 180.0);
        var elevation = asin(sin(latitude) * sin(decl) + cos(latitude) * cos(decl) * cos(hourAngle));
        
        return{
            "azimuth": azimuth,
            "elevation": elevation
        };
    }
    
    
    /* Input ecliptic x, y, z object
     * Converts to lat long coordinates.
     * @param {Object} ecliptic
     * @returns {Object}
     */
    function eclipiticToLatLon(/* Object */ ecliptic)
    {
        var lonecl = atan2( ecliptic.y, ecliptic.x );
        var latecl = atan2( ecliptic.z, sqrt(ecliptic.x * ecliptic.x + ecliptic.y * ecliptic.y) );
        
        return {
            "lat": latecl,
            "lon": rev(lonecl)
        };
    }
    
    /*
     * Input latitude, longitude, and radius to object to convert to ecliptic coords
     * @param {Number} lat
     * @param {Number} lon
     * @param {Number} r
     * @returns {Object}
     */
    function latLonToEcliptic(/* Number */ lat, /* Number */ lon, /* Number */ r)
    {
        var xg = r * cos(lon) * cos(lat);
        var yg = r * sin(lon) * cos(lat);
        var zg = r * sin(lat);
        
        return {
          "x": xg,
          "y": yg,
          "z": zg
        };
    }
    
    /*
     * Returns equatorial coords from geo-centric ecliptic coords
     * @param {Number} oblec - Obliquity to the ecliptic
     * @param {Object} ecliptic - Ecliptic coordinates object.
     * @returns {Object}
     */
    function getEquaFromEcliptic(/* Number */ oblec, /* Object */ ecliptic)
    {
        var xe = ecliptic.x;
        var ye = ecliptic.y * cos(oblec) - ecliptic.z * sin(oblec);
        var ze = ecliptic.y * sin(oblec) + ecliptic.z * cos(oblec);
        
        return {
            "x": xe,
            "y": ye,
            "z": ze
        };
    }
    
    /*
     * Calculates the delta in ecliptic longitude from Earth's nutation.
     * All inputs in degrees.
     * Returns delta degrees.
     * @param {Number} L - Mean anomaly of Moon
     * @param {Number} Lp - Mean anomaly of Sun
     * @param {Number} F - Mean argument of latitude of the Moon
     * @param {Number} D - Mean elongation of the Moon from the Sun
     * @param {Number} Om - Mean longitude of the ascending node of the Moon.
     * @returns {Number}
     */
    function deltaLongNutation(/* Number */ L, 
                                /* Number */ Lp, 
                                /* Number */ F, 
                                /* Number */ D, 
                                /* Number */ Om)
    {
        var t = T;
        var s = 0.0;
        s += (-172064161 - 174666 * t) * sin(Om) + 33386 * cos(Om);
        s += (-13170906 - 1675 * t) * sin(2 * (F - D + Om)) - 13696 * cos(2 * (F - D + Om));
        s += (-2276413 - 234 * t) * sin(2 * (F + Om)) + 2796 * cos(2 * (F + Om));
        s += (2074554 + 207 * t) * sin(2 * Om) - 698 * cos(2 * Om);
        s += (1475877 - 3633 * t) * sin(Lp) + 11817 * cos(Lp);
        s += (-516821 + 1226 * t) * sin(Lp + 2 * (F - D + Om)) - 524 * cos(Lp + 2 * (F - D + Om));
        s += (711159 + 73 * t) * sin(L) - 872 * cos(L);
        s += (-387298 - 367 * t) * sin(2 * F + Om) + 380 * cos(2 * F + Om);
        s += (-301461 - 36 * t) * sin(L + 2 * (F + Om)) + 816 * cos(L + 2 * (F + Om));
        s += (215829 - 494 * t) * sin(2 * (F - D + Om) - Lp) + 111 * cos(2 * (F - D + Om) - Lp);
        s += (128227 + 137 * t) * sin(2 * (F - D) + Om) + 181 * cos(2 * (F - D) + Om);
        s += (123457 + 11 * t) * sin(2 * (F + Om) - L) + 19 * cos(2 * (F + Om) - L);
        s += (156994 + 10 * t) * sin(2 * D - L) - 168 * cos(2 * D - L);
        s += (63110 + 63 * t) * sin(L + Om) + 27 * cos(L + Om);
        s += (-57976 - 63 * t) * sin(Om - L) - 189 * cos(Om - L);
        s += (-59641 - 11 * t) * sin(2 * (F + D + Om) - L) + 149 * cos(2 * (F + D + Om) - L);
        s += (-51613 - 42 * t) * sin(L + 2 * F + Om) + 129 * cos(L + 2 * F + Om);
        s += (45893 + 50 * t) * sin(2 * (F - L) + Om) + 31 * cos(2 * (F - L) + Om);
        s += (63384 + 11 * t) * sin(2 * D) - 150 * cos(2 * D);
        s += (-38571 - t) * sin(2 * (F + D + Om)) + 158 * cos(2 * (F + D + Om));
        s += 32481 * sin(2 * (F - Lp - D + Om));
        s -= 47722 * sin(2 * (D - L)) + 18 * cos(2 * (D - L));
        s += (-31046 - t) * sin(2 * (L + F + Om)) + 131 * cos(2 * (L + F + Om));
        s += 28593 * sin(L + 2 * (F - D + Om)) - cos(L + 2 * (F - D + Om));
        s += (20441 + 21 * t) * sin(2 * F + Om - L) + 10 * cos(2 * F + Om - L);
        s += 29243 * sin(2 * L) - 74 * cos(2 * L);
        s += 25887 * sin(2 * F) - 66 * cos(2 * F);
        s += (-14053 - 25 * t) * sin(Lp + Om) + 79 * cos(Lp + Om);
        s += (15164 + 10 * t) * sin(2 * D - L + Om) + 11 * cos(2 * D - L + Om);
        s += (-15794 + 72 * t) * sin(2 * (Lp + F - D + Om)) - 16 * cos(2 * (Lp + F - D + Om));
        s += 21783 * sin(2 * (D - F)) + 13 * cos(2 * (D - F));
        s += (-12873 - 10 * t) * sin(L - 2 * D + Om) - 37 * cos(L - 2 * D + Om);
        s += (-12654 + 11 * t) * sin(Om - Lp) + 63 * cos(Om - Lp);
        s -= 10204 * sin(2 * (F + D) + Om - L) - 25 * cos(2 * (F + D) + Om - L);
        s += (16707 - 85 * t) * sin(2 * Lp) - 10 * cos(2 * Lp);
        s -= 7691 * sin(L + 2 * (F + D + Om)) - 44 * cos(L + 2 * (F + D + Om));
        s -= 11024 * sin(2 * (F - L)) + 14 * cos(2 * (F - L));
        s += (7566 - 21 * t) * sin(Lp + 2 * (F + Om)) - 11 * cos(Lp + 2 * (F + Om));
        s += (-6637 - 11 * t) * sin(2 * (F + D) + Om) + 25 * cos(2 * (F + D) + Om);
        s += (-7141 + 21 * t) * sin(2 * (F + Om) - Lp) + 8 * cos(2 * (F + Om) - Lp);
        s += (-6302 - 11 * t) * sin(2 * D + Om) + 2 * cos(2 * D + Om);
        s += (5800 + 10 * t) * sin(L + 2 * (F - D) + Om) + 2 * cos(L + 2 * (F - D) + Om);
        s += 6443 * sin(2 * (L + F - D + Om)) - 7 * cos(2 * (L + F - D + Om));
        s += (-5774 - 11 * t) * sin(2 * (D - L) + Om) - 15 * cos(2 * (D - L) + Om);
        s -= 5350 * sin(2 * (L + F) + Om) - 21 * cos(2 * (L + F) + Om);
        s += (-4752 - 11 * t) * sin(2 * (F - D) + Om - Lp) - 3 * cos(2 * (F - D) + Om - Lp);
        s += (-4940 - 11 * t) * sin(Om - 2 * D) - 21 * cos(Om - 2 * D);
        s += 7350 * sin(2 * D - L - Lp) - 8 * cos(2 * D - L - Lp);
        s += 4065 * sin(2 * (L - D) + Om) + 6 * cos(2 * (L - D) + Om);
        s += 6579 * sin(L + 2 * D) - 24 * cos(L + 2 * D);
        s += 3579 * sin(Lp + 2 * (F - D) + Om) + 5 * cos(Lp + 2 * (F - D) + Om);
        s += 4725 * sin(L - Lp) - 6 * cos(L - Lp);
        s -= 3075 * sin(2 * (F + Om - L)) + 2 * cos(2 * (F + Om - L));
        s -= 2904 * sin(3 * L + 2 * (F + Om)) - 15 * cos(3 * L + 2 * (F + Om));
        s += 4348 * sin(2 * D - Lp) - 10 * cos(2 * D - Lp);
        s -= 2878 * sin(L - Lp + 2 * (F + Om)) - 8 * cos(L - Lp + 2 * (F + Om));
        s -= 4230 * sin(D) - 5 * cos(D);
        s -= 2819 * sin(2 * (F + D + Om) - L - Lp) - 7 * cos(2 * (F + D + Om) - L - Lp);
        s -= 4056 * sin(2 * F - L) - 5 * cos(2 * F - L);
        s -= 2647 * sin(2 * (F + D + Om) - Lp) - 11 * cos(2 * (F + D + Om) - Lp);
        s -= 2294 * sin(Om - 2 * L) + 10 * cos(Om - 2 * L);
        s += 2481 * sin(L + Lp + 2 * (F + Om)) - 7 * cos(L + Lp + 2 * (F + Om));
        s += 2179 * sin(2 * L + Om) - 2 * cos(2 * L + Om);
        s += 3276 * sin(Lp + D - L) + cos(Lp + D - L);
        s -= 3389 * sin(L + Lp) - 5 * cos(L + Lp);
        s += 3339 * sin(L + 2 * F) - 13 * cos(L + 2 * F);
        s -= 1987 * sin(2 * (F - D) + Om - L) + 6 * cos(2 * (F - D) + Om - L);
        s -= 1981 * sin(L + 2 * Om);
        s += 4026 * sin(D - L) - 353 * cos(D - L);
        s += 1660 * sin(2 * F + D + 2 * Om) - 5 * cos(D + 2 * (F + Om));
        s -= 1521 * sin(2 * (F + 2 * D + Om) - L) - 9 * cos(2 * (F + 2 * D + Om) - L);
        s += 1314 * sin(Lp + D + Om - L);
        s -= 1283 * sin(2 * (F - D - Lp) + Om);
        s -= 1331 * sin(L + 2 * F + 2 * D + Om) - 8 * cos(L + 2 * (F + D) + Om);
        s += 1383 * sin(2 * (F - L + D + Om)) - 2 * cos(2 * (F - L + D + Om));
        s += 1405 * sin(2 * Om - L) + 4 * cos(2 * Om - L);
        s += 1290 * sin(L + Lp + 2 * (F - D + Om));

        var dPsiDeg = s / 36000000000.0;
        
        return dPsiDeg;
        
    }
    
    /*
     * Calculates the delta in oblicuity in Earth's axial tilt from Earth's nutation.
     * All inputs in degrees.
     * Returns delta degrees.
     * @param {Number} L - Mean anomaly of Moon
     * @param {Number} Lp - Mean anomaly of Sun
     * @param {Number} F - Mean argument of latitude of the Moon
     * @param {Number} D - Mean elongation of the Moon from the Sun
     * @param {Number} Om - Mean longitude of the ascending node of the Moon.
     * @returns {Number}
     */
    function deltaOblicNutation(/* Number */ L, 
                                /* Number */ Lp, 
                                /* Number */ F, 
                                /* Number */ D, 
                                /* Number */ Om)
    {
        var t = T;
        var s = 0.0;
        s += (92052331 + 9086 * t) * cos(Om) + 15377 * sin(Om);
        s += (5730336 - 3015 * t) * cos(2 * (F - D + Om)) - 4587 * sin(2 * (F - D + Om));
        s += (978459 - 485 * t) * cos(2 * (F + Om)) + 1374 * sin(2 * (F + Om));
        s += (-897492 + 470 * t) * cos(2 * Om) - 291 * sin(2 * Om);
        s += (73871 - 184 * t) * cos(Lp) - 1924 * sin(Lp);
        s += (224386 - 677 * t) * cos(Lp + 2 * (F - D + Om)) - 174 * sin(Lp + 2 * (F - D + Om));
        s -= 6750 * cos(L) - 358 * sin(L);
        s += (200728 + 18 * t) * cos(2 * F + Om) + 318 * sin(2 * F + Om);
        s += (129025 - 63 * t) * cos(L + 2 * (F + Om)) + 367 * sin(L + 2 * (F + Om));
        s += (-95929 + 299 * t) * cos(2 * (F - D + Om) - Lp) + 132 * sin(2 * (F - D + Om) - Lp);
        s += (-68982 - 9 * t) * cos(2 * (F - D) + Om) + 39 * sin(2 * (F - D) + Om);
        s += (-53311 + 32 * t) * cos(2 * (F + Om) - L) - 4 * sin(2 * (F + Om) - L);
        s -= 1235 * cos(2 * D - L) - 82 * sin(2 * D - L);
        s -= 33228 * cos(L + Om) + 9 * sin(L + Om);
        s += 31429 * cos(Om - L) - 75 * sin(Om - L);
        s += (25543 - 11 * t) * cos(2 * (F + D + Om) - L) + 66 * sin(2 * (F + D + Om) - L);
        s += 26366 * cos(L + 2 * F + Om) + 78 * sin(L + 2 * F + Om);
        s += (-24236 - 10 * t) * cos(2 * (F - L) + Om) + 20 * sin(2 * (F - L) + Om);
        s -= 1220 * cos(2 * D) - 29 * sin(2 * D);
        s += (16452 - 11 * t) * cos(2 * (F + D + Om)) + 68 * sin(2 * (F + D + Om));
        s -= 13870 * cos(2 * (F - Lp - D + Om));
        s += 477 * cos(2 * (D - L)) - 25 * sin(2 * (D - L));
        s += (13238 - 11 * t) * cos(2 * (L + F + Om)) + 59 * sin(2 * (L + F + Om));
        s += (-12338 + 10 * t) * cos(L + 2 * (F - D + Om)) - 3 * sin(L + 2 * (F - D + Om));
        s -= 10758 * cos(2 * F + Om - L) + 3 * sin(2 * F + Om - L);
        s -= 609 * cos(2 * L) - 13 * sin(2 * L);
        s -= 550 * cos(2 * F) - 11 * sin(2 * F);
        s += (8551 - 2 * t) * cos(Lp + Om) - 45 * sin(Lp + Om);
        s -= 8001 * cos(2 * D + Om - L) + sin(2 * D + Om - L);
        s += (6850 - 42 * t) * cos(2 * (Lp + F - D + Om)) - 5 * sin(2 * (Lp + F - D + Om));
        s -= 167 * cos(2 * (D - F)) - 13 * sin(2 * (D - F));
        s += 6953 * cos(L - 2 * D + Om) - 14 * sin(L - 2 * D + Om);
        s += 6415 * cos(Om - Lp) + 26 * sin(Om - Lp);
        s += 5222 * cos(2 * (F + D) + Om - L) + 15 * sin(2 * (F + D) + Om - L);
        s += (168 - t) * cos(2 * Lp) + 10 * sin(2 * Lp);
        s += 3268 * cos(L + 2 * (F + D + Om)) + 19 * sin(L + 2 * (F + D + Om));
        s += 104 * cos(2 * (F - L)) + 2 * sin(2 * (F - L));
        s -= 3250 * cos(Lp + 2 * (F + Om)) + 5 * sin(Lp + 2 * (F + Om));
        s += 3353 * cos(2 * (F + D) + Om) + 14 * sin(2 * (F + D) + Om);
        s += 3070 * cos(2 * (F + Om) - Lp) + 4 * sin(2 * (F + Om) - Lp);
        s += 3272 * cos(2 * D + Om) + 4 * sin(2 * D + Om);
        s -= 3045 * cos(L + 2 * (F - D) + Om) + sin(L + 2 * (F - D) + Om);
        s -= 2768 * cos(2 * (L + F - D + Om)) + 4 * sin(2 * (L + F - D + Om));
        s += 3041 * cos(2 * (D - L) + Om) - 5 * sin(2 * (D - L) + Om);
        s += 2695 * cos(2 * (L + F) + Om) + 12 * sin(2 * (L + F) + Om);
        s += 2719 * cos(2 * (F - D) + Om - Lp) - 3 * sin(2 * (F - D) + Om - Lp);
        s += 2720 * cos(Om - 2 * D) - 9 * sin(Om - 2 * D);
        s -= 51 * cos(2 * D - L - Lp) - 4 * sin(2 * D - L - Lp);
        s -= 2206 * cos(2 * (L - D) + Om) - sin(2 * (L - D) + Om);
        s -= 199 * cos(L + 2 * D) - 2 * sin(L + 2 * D);
        s -= 1900 * cos(Lp + 2 * (F - D) + Om) - sin(Lp + 2 * (F - D) + Om);
        s -= 41 * cos(L - Lp) - 3 * sin(L - Lp);
        s += 1313 * cos(2 * (F - L + Om)) - sin(2 * (F - L + Om));
        s += 1233 * cos(3 * L + 2 * (F + Om)) + 7 * sin(3 * L + 2 * (F + Om));
        s -= 81 * cos(2 * D - Lp) - 2 * sin(2 * D - Lp);
        s += 1232 * cos(L - Lp + 2 * (F + Om)) + 4 * sin(L - Lp + 2 * (F + Om));
        s -= 20 * cos(D) + 2 * sin(D);
        s += 1207 * cos(2 * (F + D + Om) - L - Lp) + 3 * sin(2 * (F + D + Om) - L - Lp);
        s += 40 * cos(2 * F - L) - 2 * sin(2 * F - L);
        s += 1129 * cos(2 * (F + D + Om) - Lp) + 5 * sin(2 * (F + D + Om) - Lp);
        s += 1266 * cos(Om - 2 * L) - 4 * sin(Om - 2 * L);
        s -= 1062 * cos(L + Lp + 2 * (F + Om)) + 3 * sin(L + Lp + 2 * (F + Om));
        s -= 1129 * cos(2 * L + Om) + 2 * sin(2 * L + Om);
        s -= 9 * cos(Lp + D - L);
        s += 35 * cos(L + Lp) - 2 * sin(L + Lp);
        s -= 107 * cos(L + 2 * F) - sin(L + 2 * F);
        s += 1073 * cos(2 * (F - D) + Om - L) - 2 * sin(2 * (F - D) + Om - L);
        s += 854 * cos(L + 2 * Om);
        s -= 553 * cos(D - L) + 139 * sin(D - L);
        s -= 710 * cos(2 * (F + Om) + D) + 2 * sin(2 * (F + Om) + D);
        s += 647 * cos(2 * (F + 2 * D + Om) - L) + 4 * sin(2 * (F + 2 * D + Om) - L);
        s -= 700 * cos(Lp + D + Om - L);
        s += 672 * cos(2 * (F - Lp - D) + Om);
        s += 663 * cos(L + 2 * (F + D) + Om) + 4 * sin(L + 2 * (F + D) + Om);
        s -= 594 * cos(2 * (F - L + D + Om)) + 2 * sin(2 * (F - L + D + Om));
        s -= 610 * cos(2 * Om - L) - 2 * sin(2 * Om - L);
        s -= 556 * cos(L + Lp + 2 * (F - D + Om));

        var dEpsDeg = s / 36000000000.0;
        
        return dEpsDeg;
    }
    
    /*
     * Equation of the equinox in degrees
     * For later use?
     * @returns {Number}
     */
    function getEqofEquinox()
    {
        var deg = 5028.796195 * T + 1.1054348 * T2;
        
        deg /= 3600.0;
        
        return deg;
    }
    
    /*
     * Lunar coeffections for 
     * ELP2000-82B Calculations
     * @returns {Array}
     */
    function getLunarCo1()
    {
        var MoonCoefficients = [
            [0, 0, 1, 0],
            [2, 0, -1, 0],
            [2, 0, 0, 0],
            [0, 0, 2, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 2],
            [2, 0, -2, 0],
            [2, -1, -1, 0],
            [2, 0, 1, 0],
            [2, -1, 0, 0],
            [0, 1, -1, 0],
            [1, 0, 0, 0],
            [0, 1, 1, 0],
            [2, 0, 0, -2],
            [0, 0, 1, 2],
            [0, 0, 1, -2],
            [4, 0, -1, 0],
            [0, 0, 3, 0],
            [4, 0, -2, 0],
            [2, 1, -1, 0],
            [2, 1, 0, 0],
            [1, 0, -1, 0],
            [1, 1, 0, 0],
            [2, -1, 1, 0],
            [2, 0, 2, 0],
            [4, 0, 0, 0],
            [2, 0, -3, 0],
            [0, 1, -2, 0],
            [2, 0, -1, 2],
            [2, -1, -2, 0],
            [1, 0, 1, 0],
            [2, -2, 0, 0],
            [0, 1, 2, 0],
            [0, 2, 0, 0],
            [2, -2, -1, 0],
            [2, 0, 1, -2],
            [2, 0, 0, 2],
            [4, -1, -1, 0],
            [0, 0, 2, 2],
            [3, 0, -1, 0],
            [2, 1, 1, 0],
            [4, -1, -2, 0],
            [0, 2, -1, 0],
            [2, 2, -1, 0],
            [2, 1, -2, 0],
            [2, -1, 0, -2],
            [4, 0, 1, 0],
            [0, 0, 4, 0],
            [4, -1, 0, 0],
            [1, 0, -2, 0],
            [2, 1, 0, -2],
            [0, 0, 2, -2],
            [1, 1, 1, 0],
            [3, 0, -2, 0],
            [4, 0, -3, 0],
            [2, -1, 2, 0],
            [0, 2, 1, 0],
            [1, 1, -1, 0],
            [2, 0, 3, 0],
            [2, 0, -1, -2]];

        return MoonCoefficients;
    }
    
    /*
     * Lunar coeffections for 
     * ELP2000-82B Calculations
     * @returns {Array}
     */
    function getLunarCo2()
    {
        var MoonCoefficients = [
            [6288774, -20905355],
            [1274027, -3699111],
            [658314, -2955968],
            [213618, -569925],
            [-185116, 48888],
            [-114332, -3149],
            [58793, 246158],
            [57066, -152138],
            [53322, -170733],
            [45758, -204586],
            [-40923, -129620],
            [-34720, 108743],
            [-30383, 104755],
            [15327, 10321],
            [-12528, 0],
            [10980, 79661],
            [10675, -34782],
            [10034, -23210],
            [8548, -21636],
            [-7888, 24208],
            [-6766, 30824],
            [-5163, -8379],
            [4987, -16675],
            [4036, -12831],
            [3994, -10445],
            [3861, -11650],
            [3665, 14403],
            [-2689, -7003],
            [-2602, 0],
            [2390, 10056],
            [-2348, 6322],
            [2236, -9884],
            [-2120, 5751],
            [-2069, 0],
            [2048, -4950],
            [-1773, 4130],
            [-1595, 0],
            [1215, -3958],
            [-1110, 0],
            [-892, 3258],
            [-810, 2616],
            [759, -1897],
            [-713, -2117],
            [-700, 2354],
            [691, 0],
            [596, 0],
            [549, -1423],
            [537, -1117],
            [520, -1571],
            [-487, -1739],
            [-399, 0],
            [-381, -4421],
            [351, 0],
            [-340, 0],
            [330, 0],
            [327, 0],
            [-323, 1165],
            [299, 0],
            [294, 0],
            [0, 8752]];

        return MoonCoefficients;
    }
    
     /*
     * Lunar coeffections for 
     * ELP2000-82B Calculations
     * @returns {Array}
     */
    function getLunarCo3()
    {
        var moonCoefficients = [
            [0, 0, 0, 1],
            [0, 0, 1, 1],
            [0, 0, 1, -1],
            [2, 0, 0, -1],
            [2, 0, -1, 1],
            [2, 0, -1, -1],
            [2, 0, 0, 1],
            [0, 0, 2, 1],
            [2, 0, 1, -1],
            [0, 0, 2, -1],
            [2, -1, 0, -1],
            [2, 0, -2, -1],
            [2, 0, 1, 1],
            [2, 1, 0, -1],
            [2, -1, -1, 1],
            [2, -1, 0, 1],
            [2, -1, -1, -1],
            [0, 1, -1, -1],
            [4, 0, -1, -1],
            [0, 1, 0, 1],
            [0, 0, 0, 3],
            [0, 1, -1, 1],
            [1, 0, 0, 1],
            [0, 1, 1, 1],
            [0, 1, 1, -1],
            [0, 1, 0, -1],
            [1, 0, 0, -1],
            [0, 0, 3, 1],
            [4, 0, 0, -1],
            [4, 0, -1, 1],
            [0, 0, 1, -3],
            [4, 0, -2, 1],
            [2, 0, 0, -3],
            [2, 0, 2, -1],
            [2, -1, 1, -1],
            [2, 0, -2, 1],
            [0, 0, 3, -1],
            [2, 0, 2, 1],
            [2, 0, -3, -1],
            [2, 1, -1, 1],
            [2, 1, 0, 1],
            [4, 0, 0, 1],
            [2, -1, 1, 1],
            [2, -2, 0, -1],
            [0, 0, 1, 3],
            [2, 1, 1, -1],
            [1, 1, 0, -1],
            [1, 1, 0, 1],
            [0, 1, -2, -1],
            [2, 1, -1, -1],
            [1, 0, 1, 1],
            [2, -1, -2, -1],
            [0, 1, 2, 1],
            [4, 0, -2, -1],
            [4, -1, -1, -1],
            [1, 0, 1, -1],
            [4, 0, 1, -1],
            [1, 0, -1, -1],
            [4, -1, 0, -1],
            [2, -2, 0, 1]
        ];

        return moonCoefficients;
    }
    
     /*
     * Lunar coeffections for 
     * ELP2000-82B Calculations
     * @returns {Array}
     */
    function getLunarCo4()
    {
        var moonCoefficients = [
            5128122,
            280602,
            277693,
            173237,
            55413,
            46271,
            32573,
            17198,
            9266,
            8822,
            8216,
            4324,
            4200,
            -3359,
            2463,
            2211,
            2065,
            -1870,
            1828,
            -1794,
            -1749,
            -1565,
            -1491,
            -1475,
            -1410,
            -1344,
            -1335,
            1107,
            1021,
            833,
            777,
            671,
            607,
            596,
            491,
            -451,
            439,
            422,
            421,
            -366,
            -351,
            331,
            315,
            302,
            -283,
            -229,
            223,
            223,
            -220,
            -220,
            -185,
            181,
            -177,
            176,
            166,
            -164,
            132,
            -119,
            115,
            107
        ];
        
        return moonCoefficients;
    }
    
    /*
     * Returns the Moon's geocentric ecliptic latitude in degrees.
     * @returns {Number}
     */
    function getLunarEclipLatitude()
    {
        var lunarCOF3 = getLunarCo3();
        var lunarCOF4 = getLunarCo4();
        var coCount = lunarCOF3.length;
        
        var lat = 0.0;
        var deltaLat = 0.0;
        
        for(var i = 0; i < coCount; i++)
        {
            deltaLat = lunarCOF4[i] * sin(  rev(lunarCOF3[i][0] * D + 
                                            lunarCOF3[i][1] * sunM +
                                            lunarCOF3[i][2] * M + 
                                            lunarCOF3[i][3] * F));
            if(lunarCOF3[i][1] != 0)
            {
                deltaLat *= E;
            }
            
            lat += deltaLat;
        }
        
        lat -= 2235 * sin(L);
        lat += 382 * sin(A3);
        lat += 175 * sin(rev(A1 - F));
        lat += 175 * sin(rev(A1 + F));
        lat += 127 * sin(rev(L - M));
        lat -= 115 * sin(rev(L + M));
            
        lat /= 1000000.0;
            
        return lat;
    }
    
    /*
     * Returns the Moon's geocentric ecliptic longitude in decimal degrees.
     * Unperturbed
     * @returns {Number}
     */
    function getLunarEclipLongitude()
    {
        var deltaLong = 0.0;
        var deltaDeltaLong = 0.0;
        var lunarCOF1 = getLunarCo1();
        var lunarCOF2 = getLunarCo2();
        var coCount = lunarCOF1.length;
        
        for(var i = 0; i < coCount; i++)
        {
            deltaDeltaLong = lunarCOF2[i][0] * 
                        sin(rev(lunarCOF1[i][0] * D + 
                            lunarCOF1[i][1] * sunM +
                            lunarCOF1[i][2] * M + 
                            lunarCOF1[i][3] * F));
                    
            if ((lunarCOF1[i][1] == 1) || (lunarCOF1[i][1] == -1))
            {
                deltaDeltaLong *= E;
            }
            else if ((lunarCOF1[i][1] == 2) || (lunarCOF1[i][1] == -2))
            {
                deltaDeltaLong *= E2;
            }
            
            deltaLong += deltaDeltaLong;
        }
        
        deltaLong += 3958 * sin(A1);
        deltaLong += 1962 * sin(rev(L - F));
        deltaLong += 318 * sin(A2);
         
        var long = rev(L + deltaLong / 1000000.0);
        
        return long;
    }
    
    /* Returns the Moon's current geocentric radial distance in KM.
     * @returns {Number}
     */
    function getLunarRadialDistance()
    {
        var deltaR = 0.0;
        var deltaDeltaR = 0.0;
        var lunarCOF1 = getLunarCo1();
        var lunarCOF2 = getLunarCo2();
        var coCount = lunarCOF1.length;
        
        for(var i = 0; i < coCount; i++)
        {
            deltaDeltaR = lunarCOF2[i][1] * cos( rev(lunarCOF1[i][0] * D + 
                                                lunarCOF1[i][1] * sunM +
                                                lunarCOF1[i][2] * M + 
                                                lunarCOF1[i][3] * F));
            if (lunarCOF1[i].M)
            {
                deltaDeltaR *= E;
            }

            deltaR += deltaDeltaR;
        }
        
        var distance = 385000.56 + deltaR / 1000.0;
        
        return distance;
    }
    
    /*
     * TODO: Calculate the Moon's librations
     * @returns {Number}
     */
    function getLunarLibrationLon()
    {
        // TODO:
    }
    
    /*
     * Argument of Jupiter for ELP-2000-82B
     * @returns {Number}
     */
    function getArgOfJupiter()
    {
        return rev(53.09 + 479264.290 * T);   // Arg of Jupiter
    }
    
    /*
     * Argument of Venus for ELP-2000-82B
     * @returns {Number}
     */
    function getArgOfVenus()
    {
        return rev(119.75 + 131.849 * T); // Arg of Venus
    }
    
    /* TODO: Not sure what this is an arument for
     * Argument of Jupiter for ELP-2000-82B
     * @returns {Number}
     */
    function getExtraLunarArg()
    {
        return rev(313.45 + 481266.484 * T); // Not sure which perturbation this is?  Relativity?
    }
    
    /*
     * Set the date for calculating the postions of the objects.
     * If you don't call this first, getMoonPos, getSunPos... will use current time.
     * @param {Date} date
     * @returns {undefined}
     */
    this.setDate = function(/* Date */ inDate)
    {
        date = new Date(inDate);
        day = getEpochDay(date);
        T = (day + day_correction) / 36525.0;
        T2 = T * T;
        T3 = T * T2;
        T4 = T * T3;
        
        oblec = getEarthOblec(day);
        N = getLunarAscendingNode();
        M = getLunarMeanAnomaly();
        F = getLunarArgLatitude();
        D = getLunarMeanElongation();
        sunM = getSolarMeanAnomaly();
        L = getLunarMeanLongitude();
        E = getEarthEccentricity();
        E2 = E * E;
        A1 = getArgOfVenus();
        A2 = getArgOfJupiter();
        A3 = getExtraLunarArg();
        
        var deltaOblic = deltaOblicNutation(M, sunM, F, D, N);
        oblec += deltaOblic;
        
        dLongNutation = deltaLongNutation(M, sunM, F, D, N);
    };
    
    /*
     * Returns Moon's postion in the sky for specified date, latitude, and longitude
     * @param {Number} latitude
     * @param {Number} longitude
     * @returns {Object}
     * {"ra": topocentric right ascension in decimal degrees
        "decl": topocentric declination in decimal degrees,
        "elevation": topocentric elevation in decimal degrees,
        "azimuth": toposcentric azimuth in decimal degrees,
        "diameter": topocentric angular diameter in decimal degrees}
     */
    this.getMoonPosition = function(/* Number */ latitude, /* Number */ longitude, /* Numer */ elevation)
    {
        if(date == null)
        {
            this.setDate(new Date());
        }
        
        var moonEclipLong = rev(getLunarEclipLongitude(day) + dLongNutation);
        var moonEclipLat = getLunarEclipLatitude(day);  // Aprox lat correction for Oct 23, 2014: - 0.015;
        var moonDist = getLunarRadialDistance(day);
        
        var newEclipCoords = latLonToEcliptic(  moonEclipLat, 
                                                moonEclipLong,
                                                moonDist);
        
        var moonEquaCoords = getEquaFromEcliptic(oblec, newEclipCoords);
        
        
        var RA = getRA(moonEquaCoords.x, moonEquaCoords.y);
        var decl = getDecl(moonEquaCoords.x, moonEquaCoords.y, moonEquaCoords.z);
        
        var solarSiderealAngle = getSolarSiderealAngle(longitude);
       //  solarSiderealAngle -= dLongNutation * cos(oblec); // Not sure if we need to do this?
        
        var lunarHourAngle = getHourAngle(solarSiderealAngle, RA);
        
        var lunarTopRADecl = getTopRADecl(lunarHourAngle, RA, decl, moonDist, latitude, elevation);
         
        var altEl = getAltEl(lunarHourAngle, lunarTopRADecl.top_decl, latitude);
        
        var angularDiamter = getAngularDiameter(LUNAR_DIAMETER, lunarTopRADecl.top_dist);
        
        return {
            "ra": lunarTopRADecl.top_ra,
            "decl": lunarTopRADecl.top_decl,
            "elevation": altEl.elevation,
            "azimuth": altEl.azimuth,
            "diameter": angularDiamter
        };
    };
    
    /*
     * Returns Sun's postion in the sky for specified date, latitude, and longitude
     * @param {Date} date
     * @param {Number} latitude
     * @param {Number} longitude
     * @returns {Object} 
     * {"ra": topocentric right ascension in decimal degrees
        "decl": topocentric declination in decimal degrees,
        "elevation": topocentric elevation in decimal degrees,
        "azimuth": toposcentric azimuth in decimal degrees,
        "diameter": topocentric angular diameter in decimal degrees}
     */
    this.getSunPosition = function(/* Number */ latitude, /* latitude */ longitude, /* Number */ elevation)
    {
        if(date == null)
        {
            this.setDate(new Date());
        }
        
        var earthPosition = new EarthPosition();
        var earthEclip = earthPosition.getPosition(T / 10.0);
       
        var sunR = earthEclip.r;
        
        // Correcting for light time.
        var lightSeconds = sunR / SPEED_OF_LIGHT;
        var newT = T;
        newT -= (lightSeconds / (60 * 60 * 24 * 36525));
        earthEclip = earthPosition.getPosition(newT / 10.0);
        var sunLat = earthEclip.lat * (-1.0);
        var sunLon = rev(earthEclip.lon + 180.0 + dLongNutation);
        sunR = earthEclip.r;
        
        var sunEclipCoords = latLonToEcliptic(sunLat, sunLon, sunR);
       
        var sunEquaCoords = getEquaFromEcliptic(oblec, sunEclipCoords);
        
        var sunRA = getRA(sunEquaCoords.x, sunEquaCoords.y);
        var sunDECL = getDecl(sunEquaCoords.x, 
                           sunEquaCoords.y,
                           sunEquaCoords.z);
        
        var sideAngle = getSolarSiderealAngle(longitude);
        // sideAngle -= dLongNutation * cos(oblec); // Not sure if we need to do this.
     
        var hourAngle = getHourAngle(sideAngle, sunRA);
        
        var sunTopRADecl = getTopRADecl(hourAngle, sunRA, sunDECL, sunR, latitude, elevation);
        
        var angularDiamter = getAngularDiameter(SOLAR_DIAMETER, sunTopRADecl.top_dist );
        
        var sunAltEl = getAltEl(hourAngle, sunTopRADecl.top_decl, latitude);
                
        return {
            "ra": sunTopRADecl.top_ra,
            "decl": sunTopRADecl.top_decl,
            "elevation": sunAltEl.elevation,
            "azimuth": sunAltEl.azimuth,
            "diameter": angularDiamter
        };
    };
};