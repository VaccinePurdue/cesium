/*global define*/
define([
        '../Core/AttributeCompression',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/EllipsoidalOccluder',
        '../Core/IndexDatatype',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/OrientedBoundingBox',
        '../Core/TerrainCompression',
        '../Core/TerrainEncoding',
        '../Core/Transforms',
        './createTaskProcessorWorker'
    ], function(
        AttributeCompression,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        defined,
        Ellipsoid,
        EllipsoidalOccluder,
        IndexDatatype,
        CesiumMath,
        Matrix3,
        Matrix4,
        OrientedBoundingBox,
        TerrainCompression,
        TerrainEncoding,
        Transforms,
        createTaskProcessorWorker) {
    "use strict";

    var maxShort = 32767;

    var cartesian3Scratch = new Cartesian3();
    var cartographicScratch = new Cartographic();
    var toPack = new Cartesian2();
    var scratchNormal = new Cartesian3();
    var scratchToENU = new Matrix4();
    var scratchFromENU = new Matrix4();

    function createVerticesFromQuantizedTerrainMesh(parameters, transferableObjects) {
        var quantizedVertices = parameters.quantizedVertices;
        var quantizedVertexCount = quantizedVertices.length / 3;
        var octEncodedNormals = parameters.octEncodedNormals;
        var edgeVertexCount = parameters.westIndices.length + parameters.eastIndices.length +
                              parameters.southIndices.length + parameters.northIndices.length;

        var rectangle = parameters.rectangle;
        var west = rectangle.west;
        var south = rectangle.south;
        var east = rectangle.east;
        var north = rectangle.north;

        var ellipsoid = Ellipsoid.clone(parameters.ellipsoid);

        var exaggeration = parameters.exaggeration;
        var minimumHeight = parameters.minimumHeight * exaggeration;
        var maximumHeight = parameters.maximumHeight * exaggeration;

        var center = parameters.relativeToCenter;
        var fromENU = Transforms.eastNorthUpToFixedFrame(center, ellipsoid);
        var toENU = Matrix4.inverseTransformation(fromENU, new Matrix4());

        var uBuffer = quantizedVertices.subarray(0, quantizedVertexCount);
        var vBuffer = quantizedVertices.subarray(quantizedVertexCount, 2 * quantizedVertexCount);
        var heightBuffer = quantizedVertices.subarray(quantizedVertexCount * 2, 3 * quantizedVertexCount);
        var hasVertexNormals = defined(octEncodedNormals);

        var uvs = new Array(quantizedVertexCount);
        var heights = new Array(quantizedVertexCount);
        var positions = new Array(quantizedVertexCount);

        var xMin = Number.POSITIVE_INFINITY;
        var yMin = Number.POSITIVE_INFINITY;
        var zMin = Number.POSITIVE_INFINITY;

        var xMax = Number.NEGATIVE_INFINITY;
        var yMax = Number.NEGATIVE_INFINITY;
        var zMax = Number.NEGATIVE_INFINITY;

        for (var i = 0; i < quantizedVertexCount; ++i) {
            var u = uBuffer[i] / maxShort;
            var v = vBuffer[i] / maxShort;
            var height = CesiumMath.lerp(minimumHeight, maximumHeight, heightBuffer[i] / maxShort);

            cartographicScratch.longitude = CesiumMath.lerp(west, east, u);
            cartographicScratch.latitude = CesiumMath.lerp(south, north, v);
            cartographicScratch.height = height;

            var position = ellipsoid.cartographicToCartesian(cartographicScratch);

            uvs[i] = new Cartesian2(u, v);
            heights[i] = height;
            positions[i] = position;

            Matrix4.multiplyByPoint(toENU, position, cartesian3Scratch);

            xMin = Math.min(xMin, cartesian3Scratch.x);
            yMin = Math.min(yMin, cartesian3Scratch.y);
            zMin = Math.min(zMin, cartesian3Scratch.z);

            xMax = Math.max(xMax, cartesian3Scratch.x);
            yMax = Math.max(yMax, cartesian3Scratch.y);
            zMax = Math.max(zMax, cartesian3Scratch.z);
        }

        // TODO: can undo scale and bias with matrix multiply
        var encoding = new TerrainEncoding(xMin, xMax, yMin, yMax, zMin, zMax, minimumHeight, maximumHeight, fromENU, hasVertexNormals);
        var vertexStride = encoding.getStride();
        //var size = quantizedVertexCount * vertexStride + edgeVertexCount * vertexStride;
        var size = quantizedVertexCount * vertexStride;
        var vertexBuffer = new Float32Array(size);

        var n = 0;
        var bufferIndex = 0;

        for (var j = 0; j < quantizedVertexCount; ++j) {
            if (hasVertexNormals) {
                toPack.x = octEncodedNormals[n++];
                toPack.y = octEncodedNormals[n++];

                if (exaggeration !== 1.0) {
                    var normal = AttributeCompression.octDecode(toPack.x, toPack.y, scratchNormal);
                    var fromENUNormal = Transforms.eastNorthUpToFixedFrame(cartesian3Scratch, ellipsoid, scratchFromENU);
                    var toENUNormal = Matrix4.inverseTransformation(fromENUNormal, scratchToENU);

                    Matrix4.multiplyByPointAsVector(toENUNormal, normal, normal);
                    normal.z *= exaggeration;
                    Cartesian3.normalize(normal, normal);

                    Matrix4.multiplyByPointAsVector(fromENUNormal, normal, normal);
                    Cartesian3.normalize(normal, normal);

                    AttributeCompression.octEncode(normal, toPack);
                }
            }

            bufferIndex = encoding.encode(vertexBuffer, bufferIndex, positions[j], uvs[j], heights[j], toPack);
        }

        var occludeePointInScaledSpace;
        var orientedBoundingBox;
        var boundingSphere;

        if (exaggeration !== 1.0) {
            // Bounding volumes and horizon culling point need to be recomputed since the tile payload assumes no exaggeration.
            boundingSphere = BoundingSphere.fromVertices(vertexBuffer, center, vertexStride);
            orientedBoundingBox = OrientedBoundingBox.fromRectangle(rectangle, minimumHeight, maximumHeight, ellipsoid);

            var occluder = new EllipsoidalOccluder(ellipsoid);
            occludeePointInScaledSpace = occluder.computeHorizonCullingPointFromVertices(center, vertexBuffer, vertexStride);
        }

        var edgeTriangleCount = Math.max(0, (edgeVertexCount - 4) * 2);
        var indexBufferLength = parameters.indices.length + edgeTriangleCount * 3;
        var indexBuffer = IndexDatatype.createTypedArray(quantizedVertexCount + edgeVertexCount, indexBufferLength);
        indexBuffer.set(parameters.indices, 0);

        // TODO: add skirts
        /*
        // Add skirts.
        var vertexBufferIndex = quantizedVertexCount * vertexStride;
        var indexBufferIndex = parameters.indices.length;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, parameters.westIndices, center, ellipsoid, rectangle, parameters.westSkirtHeight, true, hasVertexNormals);
        vertexBufferIndex += parameters.westIndices.length * vertexStride;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, parameters.southIndices, center, ellipsoid, rectangle, parameters.southSkirtHeight, false, hasVertexNormals);
        vertexBufferIndex += parameters.southIndices.length * vertexStride;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, parameters.eastIndices, center, ellipsoid, rectangle, parameters.eastSkirtHeight, false, hasVertexNormals);
        vertexBufferIndex += parameters.eastIndices.length * vertexStride;
        addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, parameters.northIndices, center, ellipsoid, rectangle, parameters.northSkirtHeight, true, hasVertexNormals);
        */

        transferableObjects.push(vertexBuffer.buffer, indexBuffer.buffer);

        return {
            vertices : vertexBuffer.buffer,
            indices : indexBuffer.buffer,
            vertexStride : vertexStride,
            center : center,
            minimumHeight : minimumHeight,
            maximumHeight : maximumHeight,
            boundingSphere : boundingSphere,
            orientedBoundingBox : orientedBoundingBox,
            occludeePointInScaledSpace : occludeePointInScaledSpace,
            encoding : encoding
        };
    }

    /*
    function addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, edgeVertices, center, ellipsoid, rectangle, skirtLength, isWestOrNorthEdge, hasVertexNormals) {
        var start, end, increment;
        var vertexStride = 6;
        if (hasVertexNormals) {
            vertexStride += 1;
        }
        if (isWestOrNorthEdge) {
            start = edgeVertices.length - 1;
            end = -1;
            increment = -1;
        } else {
            start = 0;
            end = edgeVertices.length;
            increment = 1;
        }

        var previousIndex = -1;

        var vertexIndex = vertexBufferIndex / vertexStride;

        var north = rectangle.north;
        var south = rectangle.south;
        var east = rectangle.east;
        var west = rectangle.west;

        if (east < west) {
            east += CesiumMath.TWO_PI;
        }

        for (var i = start; i !== end; i += increment) {
            var index = edgeVertices[i];
            var offset = index * vertexStride;
            var h = vertexBuffer[offset + 3];
            var u = vertexBuffer[offset + 4];
            var v = vertexBuffer[offset + 5];

            cartographicScratch.longitude = CesiumMath.lerp(west, east, u);
            cartographicScratch.latitude = CesiumMath.lerp(south, north, v);
            cartographicScratch.height = h - skirtLength;

            var position = ellipsoid.cartographicToCartesian(cartographicScratch, cartesian3Scratch);
            Cartesian3.subtract(position, center, position);

            vertexBuffer[vertexBufferIndex++] = position.x;
            vertexBuffer[vertexBufferIndex++] = position.y;
            vertexBuffer[vertexBufferIndex++] = position.z;
            vertexBuffer[vertexBufferIndex++] = cartographicScratch.height;
            vertexBuffer[vertexBufferIndex++] = u;
            vertexBuffer[vertexBufferIndex++] = v;
            if (hasVertexNormals) {
                vertexBuffer[vertexBufferIndex++] = vertexBuffer[offset + 6];
            }

            if (previousIndex !== -1) {
                indexBuffer[indexBufferIndex++] = previousIndex;
                indexBuffer[indexBufferIndex++] = vertexIndex - 1;
                indexBuffer[indexBufferIndex++] = index;

                indexBuffer[indexBufferIndex++] = vertexIndex - 1;
                indexBuffer[indexBufferIndex++] = vertexIndex;
                indexBuffer[indexBufferIndex++] = index;
            }

            previousIndex = index;
            ++vertexIndex;
        }

        return indexBufferIndex;
    }
    */

    return createTaskProcessorWorker(createVerticesFromQuantizedTerrainMesh);
});
