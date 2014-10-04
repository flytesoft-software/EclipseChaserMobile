/* 
 * EclipseMap.js
 * 
 * Eclipse Map JavaScript Library for displaying 
 * Eclipse areas of visibility and lunar shadows on Earth.
 * Author: Joshua Berlin
 * Last Edited: 08-17-2014
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

var GPS_LOC_MARKER_IMG = 'images/loc.png';
var MANUAL_LOC_MARKER_IMG = 'images/loc-man.png';
var DEFAULT_ZOOM = 3;

/*
 * Eclipse Map object
 * eclipseCanvas: Map canvas document id
 * latIN: required number decimal latitude
 * longIN: required number decimal longitude
 */
function EclipseMap()
{
    var map = null;
    var locationMarker = null;
    var markerIcon = GPS_LOC_MARKER_IMG;
    var mapClickListener = null;
    var onMapClickFunction = null;
    var places = null;
    var placeListener = null;
    var autoCity = null;
    var bIsReady = false;

    var centralPath = null;
    var centralPathListener = null;
    var northUmbralLimit = null;
    var northUmbraLimitListener = null;
    var southUmbraLimit = null;
    var southUmbraLimitListener = null;
    var southPenumbraLimit = null;
    var southPenumbraLimitListener = null;
    var northPenumbraLimit = null;
    var northPenumbraLimitListener = null;
    var eastLimitLine = null;
    var eastLimitLineListener = null;
    var westLimitLine = null;
    var westLimitLineListener = null;

    var umbraShadow = null;
    var umbraShadowListener = null;
    var penumbraShadow = null;
    var penumbraShadowListener = null;

    var bManualMode = false;        // Set true when in manual mode.

    // Is the map ready to go?
    this.isReady = function()
    {
        return bIsReady;
    };
    
    /*
     * Returns the map object.
     * @returns {google.maps.Map|EclipseMap.map}
     */
    this.getMap = function()
    {
        return map;
    }

    /*
     * Clears any shadows on the map, if any.
     */
    this.clearShadows = function()
    {
        if (umbraShadowListener)
        {
            google.maps.event.removeListener(umbraShadowListener);
            umbraShadowListener = null;
        }
        if (umbraShadow)
        {

            umbraShadow.setMap(null);
            umbraShadow = null;
        }

        if (penumbraShadowListener)
        {
            google.maps.event.removeListener(penumbraShadowListener);
            penumbraShadowListener = null;
        }

        if (penumbraShadow)
        {
            penumbraShadow.setMap(null);
            penumbraShadow = null;
        }
    };

    // Clears all paths and polygons on map,
    // if any.
    this.clearPaths = function()
    {
        if (centralPathListener)
        {
            google.maps.event.removeListener(centralPathListener);
            centralPathListener = null;
        }
        if (centralPath)
        {
            centralPath.setMap(null);
            centralPath = null;
        }

        if (northUmbraLimitListener)
        {
            google.maps.event.removeListener(northUmbraLimitListener);
            northUmbraLimitListener = null;
        }

        if (northUmbralLimit)
        {
            northUmbralLimit.setMap(null);
            northUmbralLimit = null;
        }

        if (southUmbraLimitListener)
        {
            google.maps.event.removeListener(southUmbraLimitListener);
            southUmbraLimitListener = null;
        }

        if (southUmbraLimit)
        {
            southUmbraLimit.setMap(null);
            southUmbraLimit = null;
        }

        if (southPenumbraLimitListener)
        {
            google.maps.event.removeListener(southPenumbraLimitListener);
            southPenumbraLimitListener = null;
        }

        if (southPenumbraLimit)
        {
            southPenumbraLimit.setMap(null);
            southPenumbraLimit = null;
        }

        if (northPenumbraLimitListener)
        {
            google.maps.event.removeListener(northPenumbraLimitListener);
            northPenumbraLimitListener = null;
        }

        if (northPenumbraLimit)
        {
            northPenumbraLimit.setMap(null);
            northPenumbraLimit = null;
        }

        if (eastLimitLineListener)
        {
            google.maps.event.removeListener(eastLimitLineListener);
            eastLimitLineListener = null;
        }

        if (eastLimitLine)
        {
            eastLimitLine.setMap(null);
            eastLimitLine = null;
        }

        if (westLimitLineListener)
        {
            google.maps.event.removeListener(westLimitLineListener);
            westLimitLineListener = null;
        }

        if (westLimitLine)
        {
            westLimitLine.setMap(null);
            westLimitLine = null;
        }

        this.clearShadows();
    };

    // Input an array of lat, long coordinates to be 
    // constructed into a path line on the map.
    this.drawPath = function(coordinates, pathLine, color)
    {
        if (pathLine)
        {
            pathLine.setMap(null);
            pathLine = null;
        }

        if (map && coordinates)
        {
            var centralCoordinates = [];
            var color_code = "#000000";

            if (typeof (color) == "string")
            {
                color_code = color;
            }

            for (var i = 0; i < coordinates.length; i++)
            {
                centralCoordinates.push({lat: coordinates[i].latitude, lng: coordinates[i].longitude});
            }

            if (centralCoordinates.length > 0)
            {
                pathLine = new google.maps.Polyline(
                        {
                            path: centralCoordinates,
                            geodesic: true,
                            strokeColor: color_code,
                            strokeOpacity: 1.0,
                            strokeWeight: 2
                        });

                pathLine.setMap(map);
            }
        }

        return pathLine;
    };

    // Input an array of lat, long coordinates to be 
    // constructed into filled polygon.
    this.drawPoly = function(coordinates, pathLine, color, opacity)
    {
        if (pathLine)
        {
            pathLine.setMap(null);
            pathLine = null;
        }

        if (map && coordinates)
        {
            var centralCoordinates = [];
            var color_code = "#000000";
            var opacity_num = 0.1;

            if (typeof (color) == "string")
            {
                color_code = color;
            }

            if (typeof (opacity) == "number")
            {
                opacity_num = opacity;
            }

            for (var i = 0; i < coordinates.length; i++)
            {
                centralCoordinates.push({lat: coordinates[i].latitude, lng: coordinates[i].longitude});
            }

            if (centralCoordinates.length > 0)
            {
                pathLine = new google.maps.Polygon(
                        {
                            paths: centralCoordinates,
                            geodesic: true,
                            strokeColor: color_code,
                            strokeOpacity: 1.0,
                            strokeWeight: 0,
                            fillColor: color_code,
                            fillOpacity: opacity_num
                        });

                pathLine.setMap(map);
            }
        }

        return pathLine;
    };

    this.drawCentralPath = function(coordinates)
    {
        centralPath = this.drawPath(coordinates, centralPath, "black");
        if (bManualMode && centralPath)
        {
            if (centralPathListener)
            {
                google.maps.event.removeListener(centralPathListener);
                centralPathListener = null;
            }
            centralPathListener = google.maps.event.addListener(centralPath, 'click', proxiedClick);
        }
    };

    this.drawNorthUmbraLimit = function(coordinates)
    {
        northUmbralLimit = this.drawPath(coordinates, northUmbralLimit, "#black");
        if (bManualMode && northUmbralLimit)
        {
            if (northUmbraLimitListener)
            {
                google.maps.event.removeListener(northUmbraLimitListener);
                northUmbraLimitListener = null;
            }
            northUmbraLimitListener = google.maps.event.addListener(northUmbralLimit, 'click', proxiedClick);
        }
    };

    this.drawSouthUmbraLimit = function(coordinates)
    {
        southUmbraLimit = this.drawPath(coordinates, southUmbraLimit, "#black");
        if (bManualMode && southUmbraLimit)
        {
            if (southUmbraLimitListener)
            {
                google.maps.event.removeListener(southUmbraLimitListener);
                southUmbraLimitListener = null;
            }
            southUmbraLimitListener = google.maps.event.addListener(southUmbraLimit, 'click', proxiedClick);
        }
    };

    this.drawSouthPenumbraLimit = function(coordinates)
    {
        southPenumbraLimit = this.drawPath(coordinates, southPenumbraLimit, "#FE2E2E");
        if (bManualMode && southPenumbraLimit)
        {
            if (southPenumbraLimitListener)
            {
                google.maps.event.removeListener(southPenumbraLimitListener);
                southPenumbraLimitListener = null;
            }
            southPenumbraLimitListener = google.maps.event.addListener(southPenumbraLimit, 'click', proxiedClick);
        }
    };

    this.drawNorthPenumbraLimit = function(coordinates)
    {
        northPenumbraLimit = this.drawPath(coordinates, northPenumbraLimit, "#FE2E2E");
        if (bManualMode && northPenumbraLimit)
        {
            if (northPenumbraLimitListener)
            {
                google.maps.event.removeListener(northPenumbraLimitListener);
                northPenumbraLimitListener = null;
            }
            northPenumbraLimitListener = google.maps.event.addListener(northPenumbraLimit, 'click', proxiedClick);
        }
    };

    this.drawEastLimitLine = function(coordinates)
    {
        eastLimitLine = this.drawPath(coordinates, eastLimitLine, "#FE2E2E");
        if (bManualMode && eastLimitLine)
        {
            if (eastLimitLineListener)
            {
                google.maps.event.removeListener(eastLimitLineListener);
                eastLimitLineListener = null;
            }
            eastLimitLineListener = google.maps.event.addListener(eastLimitLine, 'click', proxiedClick);
        }
    };

    this.drawWestLimitLine = function(coordinates)
    {
        westLimitLine = this.drawPath(coordinates, westLimitLine, "#FE2E2E");
        if (bManualMode && westLimitLine)
        {
            if (westLimitLineListener)
            {
                google.maps.event.removeListener(westLimitLineListener);
                westLimitLineListener = null;
            }
            westLimitLineListener = google.maps.event.addListener(westLimitLine, 'click', proxiedClick);
        }
    };

    this.drawUmbraShadow = function(coordinates)
    {
        umbraShadow = this.drawPoly(coordinates, umbraShadow, "#000000", 0.6);
        if (bManualMode && umbraShadow)
        {
            if (umbraShadowListener)
            {
                google.maps.event.removeListener(umbraShadowListener);
                umbraShadowListener = null;
            }
            umbraShadowListener = google.maps.event.addListener(umbraShadow, 'click', proxiedClick);
        }
    };

    this.drawPenumbraShadow = function(coordinates)
    {
        penumbraShadow = this.drawPoly(coordinates, penumbraShadow, "#000000", 0.2);
        if (bManualMode && penumbraShadow)
        {
            if (penumbraShadowListener)
            {
                google.maps.event.removeListener(penumbraShadowListener);
                penumbraShadowListener = null;
            }
            penumbraShadowListener = google.maps.event.addListener(penumbraShadow, 'click', proxiedClick);
        }
    };

    // Resize the map to fit the canvas size.
    this.resizeMap = function()
    {
        if (map)
        {
            google.maps.event.trigger(map, 'resize');
            console.log("Map resized.");
        }
    };

    // Set the text box that will have a city autocomplete.
    this.setAutoComplete = function(autoCompleteID)
    {
        if (!places)
        {
            try
            {
                places = new google.maps.places.PlacesService(map);
            }
            catch (error)
            {
                console.log("Google places not available.");
            }
        }

        if (!autoCity)
        {
            try
            {
                /**
                autoCity = new google.maps.places.Autocomplete(autoCompleteID,
                        {
                            types: [ '(cities)']
                        });
               **/
               autoCity = new google.maps.places.Autocomplete(autoCompleteID);
            }
            catch (error)
            {
                console.log("Google autocomplete not available.");
            }

            if (autoCity)
            {
                var proxiedPlace = $.proxy(this.onPlaceChanged, this);

                placeListener = google.maps.event.addListener(autoCity, 'place_changed', proxiedPlace);
            }
        }
    };

    // Place selected.
    this.onPlaceChanged = function()
    {
        var place = autoCity.getPlace();

        if (place.geometry)
        {
            map.setCenter(place.geometry.location);
            locationMarker.setPosition(place.geometry.location);

            if (typeof (onMapClickFunction) == "function")
            {
                onMapClickFunction(place.geometry.location.lat(), place.geometry.location.lng());
            }
        }
    };

    // Set the map canvas and creat map object, if necessary.
    this.setCanvas = function(eclipseCanvas)
    {
        if (typeof (google) == "object")
        {
            var centerLatLng = new google.maps.LatLng(34, -118);
            var eclipseMapOptions =
                    {
                        center: centerLatLng,
                        zoom: DEFAULT_ZOOM,
                        mapTypeId: google.maps.MapTypeId.ROADMAP
                    };

            map = new google.maps.Map(eclipseCanvas, eclipseMapOptions);

            locationMarker = new google.maps.Marker
                    ({
                        position: centerLatLng,
                        map: map,
                        icon: markerIcon
                    });

            bIsReady = true;

            console.log("Map created.");
        }
        else
        {
            console.log("Google services not available for map.");
        }
    };

    this.setCenter = function(latitude, longitude)
    {
        if (map)
        {
            map.setCenter({lat: latitude, lng: longitude});
        }
    };

    this.setZoom = function(zoom)
    {
        if (map)
        {
            map.setZoom(zoom);
        }
    };

    this.setMarkerPosition = function(latitude, longitude)
    {
        if (locationMarker)
        {
            locationMarker.setPosition({lat: latitude, lng: longitude});
        }
    };

    // Sets the manual marker.
    this.setManualMarker = function()
    {
        markerIcon = MANUAL_LOC_MARKER_IMG;

        if (locationMarker)
        {
            locationMarker.setIcon(markerIcon);
        }
        ;
    };

    this.setGPSMarker = function()
    {
        markerIcon = GPS_LOC_MARKER_IMG;

        if (locationMarker)
        {
            locationMarker.setIcon(markerIcon);
        }
        ;
    };

    /*
     * Set map click listeners
     */
    this.setMapClicks = function()
    {
        this.removeMapClicks();
        if (map)
        {
            mapClickListener = google.maps.event.addListener(map, 'click', proxiedClick);

            if (penumbraShadow)
            {
                penumbraShadowListener = google.maps.event.addListener(penumbraShadow, 'click', proxiedClick);
            }

            if (umbraShadow)
            {
                umbraShadowListener = google.maps.event.addListener(umbraShadow, 'click', proxiedClick);
            }

            if (centralPath)
            {
                centralPathListener = google.maps.event.addListener(centralPath, 'click', proxiedClick);
            }

            if (northUmbralLimit)
            {
                northUmbraLimitListener = google.maps.event.addListener(northUmbralLimit, 'click', proxiedClick);
            }

            if (southUmbraLimit)
            {
                southUmbraLimitListener = google.maps.event.addListener(southUmbraLimit, 'click', proxiedClick);
            }

            if (southPenumbraLimit)
            {
                southPenumbraLimitListener = google.maps.event.addListener(southPenumbraLimit, 'click', proxiedClick);
            }

            if (northPenumbraLimit)
            {
                northPenumbraLimitListener = google.maps.event.addListener(northPenumbraLimit, 'click', proxiedClick);
            }
            if (eastLimitLine)
            {
                eastLimitLineListener = google.maps.event.addListener(eastLimitLine, 'click', proxiedClick);
            }
            if (westLimitLine)
            {
                westLimitLineListener = google.maps.event.addListener(westLimitLine, 'click', proxiedClick);
            }
        }
    };

    /*
     * Remove map click listeners
     */
    this.removeMapClicks = function()
    {
        if (mapClickListener != null)
        {
            google.maps.event.removeListener(mapClickListener);
            mapClickListener = null;
        }
        if (penumbraShadowListener)
        {
            google.maps.event.removeListener(penumbraShadowListener);
            penumbraShadowListener = null;
        }
        if (umbraShadowListener)
        {
            google.maps.event.removeListener(umbraShadowListener);
            umbraShadowListener = null;
        }
        if (centralPathListener)
        {
            google.maps.event.removeListener(centralPathListener);
            centralPathListener = null;
        }
        if (northUmbraLimitListener)
        {
            google.maps.event.removeListener(northUmbraLimitListener);
            northUmbraLimitListener = null;
        }
        if (southUmbraLimitListener)
        {
            google.maps.event.removeListener(southUmbraLimitListener);
            southUmbraLimitListener = null;
        }

        if (southPenumbraLimitListener)
        {
            google.maps.event.removeListener(southPenumbraLimitListener);
            southPenumbraLimitListener = null;
        }
        if (northPenumbraLimitListener)
        {
            google.maps.event.removeListener(northPenumbraLimitListener);
            northPenumbraLimitListener = null;
        }
        if (eastLimitLineListener)
        {
            google.maps.event.removeListener(eastLimitLineListener);
            eastLimitLineListener = null;
        }
        if (westLimitLineListener)
        {
            google.maps.event.removeListener(westLimitLineListener);
            westLimitLineListener = null;
        }

    };

    // Set manual mode
    // input bMode Boolean value, if true, set manual, if false, set GPS.
    this.setManualMode = function(bMode)
    {
        if (typeof (bMode) == "boolean")
        {
            bManualMode = bMode;
            if (bMode)
            {
                this.setManualMarker();
                if (map)
                {
                    this.setMapClicks();
                }
            }
            else
            {
                this.setGPSMarker();
                this.removeMapClicks();
            }
        }
        else
        {
            bManualMode = true;
            this.setManualMarker();
            if (map)
            {
                this.setMapClicks();
            }
        }
    };

    // set the the function to be called when map is clicked.
    // input function(latitude, longitude)
    this.setOnMapClick = function(onMapClickFunc)
    {
        onMapClickFunction = onMapClickFunc;
    };

    // Called on map click event.
    this.onMapClick = function(event)
    {
        console.log("Manual mode click.");

        locationMarker.setPosition(event.latLng);

        if (typeof (onMapClickFunction) == "function")
        {
            onMapClickFunction(event.latLng.lat(), event.latLng.lng());
        }
    };
    
    var proxiedClick = $.proxy(this.onMapClick, this);
}
