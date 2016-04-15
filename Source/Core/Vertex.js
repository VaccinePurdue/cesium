/*global define*/
define([
        './Cartesian3',
        './Color',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './VertexFormat'
    ], function(
        Cartesian3,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        VertexFormat) {
    "use strict";

    /**
     * An object that encapsulates attributes that exist at a given vertex. Each vertex is given a
     *  {@link VertexFormat} that will specify the attributes required by this vertex.
     *
     * @alias Vertex
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Number} [options.id] required id of the vertex to link vertices.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be contained within a vertex. If options does not contain the variables specified by {@link VertexFormat} then an error will be thrown.
     * @param {Cartesian3} [options.position] An xyz Cartesian coordinate defining the location of the vertex.
     * @param {Cartesian3} [options.normal] (normalized), which is commonly used for lighting of the vertex.
     * @param {Cartesian2} [options.st] 2D texture coordinate attribute of the vertex.
     * @param {Cartesian3} [options.binormal] (normalized), which is used for tangent-space effects like bump mapping.
     * @param {Cartesian3} [options.tangent] (normalized), which is used for tangent-space effects like bump mapping.
     * @param {Color} [options.colors] the {@link Color} color of the vertex.
     *
     * @exception {DeveloperError} position must be defined based on the specified vertex format.
     * @exception {DeveloperError} normal must be defined based on the specified vertex format.
     * @exception {DeveloperError} st must be defined based on the specified vertex format.
     * @exception {DeveloperError} binormal must be defined based on the specified vertex format.
     * @exception {DeveloperError} tangent must be defined based on the specified vertex format.
     * @exception {DeveloperError} color must be defined based on the specified vertex format.
     *
     * @see Vertex#createGeometry
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=development/MultiColorTriangle.html|Cesium Sandcastle MultiColorTriangle Demo}
     *
     *
     */

    var Vertex = function(options) {
        this._vertexFormat = VertexFormat.clone(defaultValue(options.vertexFormat, VertexFormat.DEFAULT));

        //>>includeStart('debug', pragmas.debug);
        //if (!defined(options.id)) {
        //    throw new DeveloperError('id must be defined for vertex format.');
        //}
        if (!defined(options.position) && this._vertexFormat.position) {
            throw new DeveloperError('position must be defined based on the specified vertex format.');
        }
        if (!defined(options.normal) && this._vertexFormat.normal) {
            throw new DeveloperError('normal must be defined based on the specified vertex format.');
        }
        if (!defined(options.st) && this._vertexFormat.st) {
            throw new DeveloperError('st must be defined based on the specified vertex format.');
        }
        if (!defined(options.binormal) && this._vertexFormat.binormal) {
            throw new DeveloperError('binormal must be defined based on the specified vertex format.');
        }
        if (!defined(options.tangent) && this._vertexFormat.tangent) {
            throw new DeveloperError('tangent must be defined based on the specified vertex format.');
        }
        if (!defined(options.color) && this._vertexFormat.color) {
            throw new DeveloperError('color must be defined based on the specified vertex format.');
        }
        //>>includeEnd('debug');
        this.id = options.id;
        this.position = defined(options.position)? options.position : undefined;
        this.normal = defined(options.normal)? options.normal : undefined;
        this.st = defined(options.st)? options.st : undefined;
        this.binormal = defined(options.binormal)? options.binormal : undefined;
        this.tangent = defined(options.tangent)? options.tangent : undefined;
        this.color = defined(options.color)? options.color : undefined;


        //this._workerName = 'createVertex';
    };




    /* should vertex be a geometry? can I create worker for non-geometry type? I think so...
    Vertex.createGeometry = function(Vertex) {
        var vertexFormat = Vertex._vertexFormat;

        return new Vertex();
    };*/

    return Vertex;
});