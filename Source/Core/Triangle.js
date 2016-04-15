/*global define*/
define([
        './Cartesian3',
        './Color',
        './defined',
        './defaultValue',
        './DeveloperError',
        './Vertex',
        './VertexFormat'
    ], function(
        Cartesian3,
        Color,
        defined,
        defaultValue,
        DeveloperError,
        Vertex,
        VertexFormat) {
    "use strict";
    /**
     * An object that encapsulates exactly 3 {@link Vertex}vertices. Each vertex will contain attributes for the
     * triangle.
     *
     * @alias Vertex
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Vertex[]} vertices list of exactly 3 vertices that define the attributes of the vertex for the triangle.
     *
     * @exception {DeveloperError} vertices must be defined.
     *
     * @see Vertex#createGeometry
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=development/MultiColorTriangle.html|Cesium Sandcastle MultiColorTriangle Demo}
     *
     *
     */
    var Triangle = function(options) {
            //>>includeStart('debug', pragmas.debug);

            if (!defined(options.vertices) || options.vertices.length !== 3) {
                throw new DeveloperError('vertices must be defined and be equal to 3.');
            }

            //>>includeEnd('debug');

            this.id = options.id;
            this.vertices = defined(options.vertices)? options.vertices : undefined;
            this._vertexFormat = VertexFormat.clone(defaultValue(options.vertexFormat, VertexFormat.POSITION_AND_COLOR));
            //this._workerName = 'createVertex';
    };

    return Triangle;
});