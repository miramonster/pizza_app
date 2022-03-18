import React from "react";
import "./index.css";
import "./App.css";
import mapStyles from "./mapStyles";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useLoadScript,
} from "@react-google-maps/api";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption,
} from "@reach/combobox";

import "@reach/combobox/styles.css";

const libraries = ["places"];

const mapContainerStyle = {
  width: "100vw",
  height: "100vh",
};

const center = {
  lat: 29.760427,
  lng: -95.369804,
};
const options = {
  styles: mapStyles,
  disableDefaultUI: true,
  zoomControl: true,
};
export default function App() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyChx65TaOoV6FVspAn917zZm2siJHJsuEg",
    libraries,
  });

  const [userGeo, setUserGeo] = React.useState(null);

  const [markers, setMarkers] = React.useState([]);

  // const onMapClick = React.useCallback((event) => {
  //   setMarkers((current) => [
  //     ...current,
  //     {
  //       lat: event.latLng.lat(),
  //       lng: event.latLng.lng(),
  //       time: new Date(),
  //     },
  //   ]);
  // }, []);

  const mapRef = React.useRef();
  let placesService;

  const onMapLoad = React.useCallback((map) => {
    mapRef.current = map;
  }, []);

  const panTo = React.useCallback(({ lat, lng }) => {
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(12);
  }, []);

  const [selected, setSelected] = React.useState(null);

  const milesFrom = (userLocation, targetLocation) => {
    const { location } = targetLocation.geometry;
    let dx = userLocation.lat - location.lat(),
      dy = userLocation.lng - location.lng();
    return Math.hypot(dx, dy) * 69.2;
  };

  const radialSearchTrigger = React.useCallback(
    (userPosition, placesService) => {
      const searchCircle = new window.google.maps.Circle({
        center: userPosition,
        radius: 1609.344 * 25, // rough convertion from meters to miles
      });
      // console.log(placesService)
      placesService.textSearch(
        {
          query: "Pizza",
          // openNow: true,
          location: userPosition,
          radius: 1609.344 * 50,
          type: ["resturaunt"],
        },
        (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            setMarkers(
              results.map((result) => ({
                ...result,
                distanceFromUser: milesFrom(userPosition, result),
              }))
            );
          }
        }
      );
    },
    [mapRef.current]
  );

  React.useEffect(() => {
    console.log("userGeo: ", userGeo);
    if (mapRef.current && userGeo) {
      placesService = new window.google.maps.places.PlacesService(
        mapRef.current
      );
      radialSearchTrigger(userGeo, placesService);
    }
  }, [mapRef.current, userGeo]);

  const markerMaker = (marker) => {
    const { geometry, name, place_id } = marker;
    return (
      <Marker
        key={place_id}
        position={{
          lat: geometry.location.lat(),
          lng: geometry.location.lng(),
        }}
        title={name}
        onClick={() => {
          setSelected({
            lat: geometry.location.lat(),
            lng: geometry.location.lng(),
          });
        }}
        icon={{
          url: "./topPizza.png",
          scaledSize: new window.google.maps.Size(30, 30),
        }}
      />
    );
  };

  if (loadError) return "Error loading maps";

  if (!isLoaded) return "loading maps";

  return (
    <div>
      <h1>
        Pizza Hunter
        <img src={"./topPizza.png"} width="auto" height="80" />
      </h1>

      <Locate
        panTo={panTo}
        setUserGeo={setUserGeo}
        radialSearchTrigger={radialSearchTrigger}
      />
      <Search panTo={panTo} setUserGeo={setUserGeo} />

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={8}
        center={center}
        options={options}
        // onClick={onMapClick}
        onLoad={onMapLoad}
      >
        {userGeo?.lat && userGeo?.lng && (
          <Marker
            key="userPosition"
            position={userGeo}
            icon={{
              url: "./meeple.png",
              scaledSize: new window.google.maps.Size(60, 60),
            }}
          />
        )}

        {markers.map(markerMaker)}
        {selected ? (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => {
              setSelected(null);
            }}
          >
            <div>
              <h2>
                <span role="img" aria-label="pizza">
                  🍕
                </span>{" "}
                place holder
              </h2>
              <p>address spot</p>
            </div>
          </InfoWindow>
        ) : null}
      </GoogleMap>
    </div>
  );
}

function Locate({ panTo, setUserGeo, radialSearchTrigger }) {
  return (
    <button
      className="locate"
      onClick={() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const userPosition = { lat: latitude, lng: longitude };
            panTo(userPosition);
            setUserGeo(userPosition);
            //  radialSearchTrigger(userPosition);
          },
          () => null //TODO: Error Handle
        );
      }}
    >
      <img src={"./compassRose.png"} alt="compass locate me" />
    </button>
  );
}

function Search({ panTo, setUserGeo }) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestion,
  } = usePlacesAutocomplete({
    requestOptions: {
      location: { lat: () => 29.760427, lng: () => -95.369804 },
      radius: 15 * 1000,
    },
  });

  return (
    <div className="search">
      <Combobox
        onSelect={async (address) => {
          setValue(address, false);
          //clearSuggestion();

          try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);
            panTo({ lat, lng });
            setUserGeo({ lat, lng });
          } catch (error) {
            console.log("error");
          }

          //console.log(address);
        }}
      >
        <ComboboxInput
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          disabled={!ready}
          placeholder="Enter current address"
        />
        <ComboboxPopover>
          <ComboboxList>
            {status === "OK" &&
              data.map(({ place_id, description }) => (
                <ComboboxOption key={place_id} value={description} />
              ))}
          </ComboboxList>
        </ComboboxPopover>
      </Combobox>
    </div>
  );
}
