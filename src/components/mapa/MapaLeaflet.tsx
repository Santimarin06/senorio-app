// Mapa OpenStreetMap + Leaflet dentro de una WebView (como OpenStreetMap.tsx en Mapas).
// Diferencia con clase: el HTML se crea una sola vez y la posición se cambia con
// injectJavaScript, en vez de volver a montar la WebView en cada movimiento.
import { ComponentType, forwardRef, Ref, useImperativeHandle, useMemo, useRef } from 'react';
import WebView, { WebViewMessageEvent, WebViewProps } from 'react-native-webview';

import type { LatLng } from '@/types/ubicacion';

// Los tipos de react-native-webview 14 no aceptan `ref` con los tipos de React 19.3
// (las props quedan como `never`). Este alias declara las props reales; no cambia el componente.
const WebViewTipado = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebView> }>;

export interface MapaLeafletRef {
  /** Centra el mapa en un punto. */
  centrarEn: (punto: LatLng) => void;
  /** Dibuja o mueve el punto azul del dispositivo. */
  marcarDispositivo: (punto: LatLng) => void;
}

interface Props {
  local: LatLng;
  tituloLocal: string;
  onListo?: () => void;
  onArrastre?: () => void;
  onFallo?: () => void;
}

const crearHtml = (local: LatLng, titulo: string): string => `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;width:100%;margin:0;padding:0}.leaflet-control-attribution{font-size:10px!important}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var enviar=function(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(m);};
  if(typeof L==='undefined'){enviar('fallo');return;}
  var local=${JSON.stringify([local.latitude, local.longitude])};
  var map=L.map('map').setView(local,17);
  var capa=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  var errores=0;capa.on('tileerror',function(){errores++;if(errores===5)enviar('fallo');});
  var tituloLocal=document.createElement('b');tituloLocal.textContent=${JSON.stringify(titulo)};
  L.marker(local).addTo(map).bindPopup(tituloLocal).openPopup();
  var dispositivo=null;
  window.marcarDispositivo=function(lat,lng){
    if(!dispositivo){dispositivo=L.circleMarker([lat,lng],{radius:9,color:'#1857c9',weight:3,fillColor:'#3485ff',fillOpacity:0.9}).addTo(map).bindPopup('Tu ubicación');}
    else{dispositivo.setLatLng([lat,lng]);}
  };
  window.centrarEn=function(lat,lng){map.setView([lat,lng],map.getZoom(),{animate:true});};
  map.on('dragstart',function(){enviar('arrastre');});
  enviar('listo');
})();
</script></body></html>`;

const MapaLeaflet = forwardRef<MapaLeafletRef, Props>(
  ({ local, tituloLocal, onListo, onArrastre, onFallo }, ref) => {
    const webRef = useRef<WebView>(null);

    // Solo depende del local: no se vuelve a crear cuando se mueve el dispositivo.
    const html = useMemo(
      () => crearHtml(local, tituloLocal),
      [local, tituloLocal],
    );

    const ejecutar = (codigo: string) => webRef.current?.injectJavaScript(`${codigo};true;`);

    useImperativeHandle(ref, () => ({
      centrarEn: ({ latitude, longitude }) => ejecutar(`window.centrarEn(${latitude},${longitude})`),
      marcarDispositivo: ({ latitude, longitude }) =>
        ejecutar(`window.marcarDispositivo(${latitude},${longitude})`),
    }));

    const alRecibir = (evento: WebViewMessageEvent) => {
      const mensaje = evento.nativeEvent.data;
      if (mensaje === 'listo') onListo?.();
      if (mensaje === 'arrastre') onArrastre?.();
      if (mensaje === 'fallo') onFallo?.();
    };

    return (
      <WebViewTipado
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://localhost/' }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={alRecibir}
        onError={() => onFallo?.()}
        style={{ flex: 1 }}
      />
    );
  },
);

MapaLeaflet.displayName = 'MapaLeaflet';
export default MapaLeaflet;
