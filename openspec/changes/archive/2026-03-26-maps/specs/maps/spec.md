# Delta for Maps

## ADDED Requirements

### Requirement: Leaflet Integration

The system SHALL render interactive maps using Leaflet.js with CRS.Simple.

#### Scenario: Rendering a map with CRS.Simple
- GIVEN a map entity with an uploaded image
- WHEN the user navigates to the map view
- THEN Leaflet.js initializes with CRS.Simple (non-geographic pixel coordinates)
- AND the image is displayed as a tile layer bounded to its pixel dimensions

#### Scenario: Pin rendering on Leaflet map
- GIVEN a map with associated pin records in the database
- WHEN the Leaflet map finishes loading
- THEN all pins are rendered as Leaflet markers at their stored x/y coordinates
- AND each marker displays a tooltip on hover with the pin name
