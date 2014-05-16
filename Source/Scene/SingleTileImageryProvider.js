/*global define*/
define([
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/GeographicTilingScheme',
        '../Core/loadImage',
        '../Core/Rectangle',
        '../Core/TileProviderError',
        '../ThirdParty/when'
    ], function(
        Credit,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        GeographicTilingScheme,
        loadImage,
        Rectangle,
        TileProviderError,
        when) {
    "use strict";

    /**
     * Provides a single, top-level imagery tile.  The single image is assumed to use a
     * {@link GeographicTilingScheme}.
     *
     * @alias SingleTileImageryProvider
     * @constructor
     *
     * @param {String} options.url The url for the tile.
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
     * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
     * @param {Object} [options.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     */
    var SingleTileImageryProvider = function(options) {
        options = defaultValue(options, {});
        var url = options.url;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        this._url = url;

        var proxy = options.proxy;
        this._proxy = proxy;

        var rectangle = defaultValue(options.rectangle, Rectangle.MAX_VALUE);
        var tilingScheme = new GeographicTilingScheme({
            rectangle : rectangle,
            numberOfLevelZeroTilesX : 1,
            numberOfLevelZeroTilesY : 1
        });
        this._tilingScheme = tilingScheme;

        this._image = undefined;
        this._texture = undefined;
        this._tileWidth = 0;
        this._tileHeight = 0;

        this._errorEvent = new Event();

        this._ready = false;

        var imageUrl = url;
        if (defined(proxy)) {
            imageUrl = proxy.getURL(imageUrl);
        }

        var credit = options.credit;
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;

        var that = this;
        var error;

        function success(image) {
            that._image = image;
            that._tileWidth = image.width;
            that._tileHeight = image.height;
            that._ready = true;
            TileProviderError.handleSuccess(that._errorEvent);
        }

        function failure(e) {
            var message = 'Failed to load image ' + imageUrl + '.';
            error = TileProviderError.handleError(
                    error,
                    that,
                    that._errorEvent,
                    message,
                    0, 0, 0,
                    doRequest);
        }

        function doRequest() {
            when(loadImage(imageUrl), success, failure);
        }

        doRequest();
    };


    defineProperties(SingleTileImageryProvider.prototype, {
        /**
         * Gets the URL of the single, top-level imagery tile.
         * @memberof SingleTileImageryProvider.prototype
         * @type {String}
         */
        url : {
            get : function() {
                return this._url;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof SingleTileImageryProvider.prototype
         * @type {Proxy}
         */
        proxy : {
            get : function() {
                return this._proxy;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link SingleTileImageryProvider#ready} returns true.
         * @memberof SingleTileImageryProvider.prototype
         * @type {Number}
         */
        tileWidth : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileWidth must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tileWidth;
            }
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link SingleTileImageryProvider#ready} returns true.
         * @memberof SingleTileImageryProvider.prototype
         * @type {Number}
         */
        tileHeight: {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileHeight must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tileHeight;
            }
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link SingleTileImageryProvider#ready} returns true.
         * @memberof SingleTileImageryProvider.prototype
         * @type {Number}
         */
        maximumLevel : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('maximumLevel must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return 0;
            }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link SingleTileImageryProvider#ready} returns true.
         * @memberof SingleTileImageryProvider.prototype
         * @type {Number}
         */
        minimumLevel : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('minimumLevel must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return 0;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link SingleTileImageryProvider#ready} returns true.
         * @memberof SingleTileImageryProvider.prototype
         * @type {TilingScheme}
         */
        tilingScheme : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tilingScheme must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return this._tilingScheme;
            }
        },

        /**
         * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
         * not be called before {@link SingleTileImageryProvider#ready} returns true.
         * @memberof SingleTileImageryProvider.prototype
         * @type {Rectangle}
         */
        rectangle : {
            get : function() {
                return this._tilingScheme.rectangle;
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link SingleTileImageryProvider#ready} returns true.
         * @memberof SingleTileImageryProvider.prototype
         * @type {TileDiscardPolicy}
         */
        tileDiscardPolicy : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!this._ready) {
                    throw new DeveloperError('tileDiscardPolicy must not be called before the imagery provider is ready.');
                }
                //>>includeEnd('debug');

                return undefined;
            }
        },

        /**
         * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof SingleTileImageryProvider.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof SingleTileImageryProvider.prototype
         * @type {Boolean}
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link SingleTileImageryProvider#ready} returns true.
         * @memberof SingleTileImageryProvider.prototype
         * @type {Credit}
         */
        credit : {
            get : function() {
                return this._credit;
            }
        },

        /**
         * Gets a value indicating whether or not the images provided by this imagery provider
         * include an alpha channel.  If this property is false, an alpha channel, if present, will
         * be ignored.  If this property is true, any images without an alpha channel will be treated
         * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
         * and texture upload time are reduced.
         * @type {Boolean}
         */
        hasAlphaChannel : {
            get : function() {
                return true;
            }
        }
    });

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     *
     * @memberof SingleTileImageryProvider
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     *
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
     */
    SingleTileImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link SingleTileImageryProvider#ready} returns true.
     *
     * @memberof SingleTileImageryProvider
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     *
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
     */
    SingleTileImageryProvider.prototype.requestImage = function(x, y, level) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        //>>includeEnd('debug');

        return this._image;
    };

    return SingleTileImageryProvider;
});
