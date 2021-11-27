import '../styles/globals.scss'
import { useEffect, useState } from "react";
import type { AppProps /*, AppContext */ } from 'next/app'
import socketContext from '../context/socketContext';
import Cookies from 'js-cookie';;
import { io } from "socket.io-client";

const socket = io(process.env.WEBSOCKET_SERVER, {transports: ['websocket']});

let userCookie = Cookies.get("user-token");
socket.emit('user-token', userCookie);
socket.on('user-token', (data) => {
  Cookies.set('user-token', data);
})

const MyApp = ({ Component, pageProps }: AppProps) => {
  return (
    <socketContext.Provider value={socket}>
      <Component {...pageProps} />
    </socketContext.Provider>
  )
}

// Only uncomment this method if you have blocking data requirements for
// every single page in your application. This disables the ability to
// perform automatic static optimization, causing every page in your app to
// be server-side rendered.
//
// MyApp.getInitialProps = async (appContext: AppContext) => {
//   // calls page's `getInitialProps` and fills `appProps.pageProps`
//   const appProps = await App.getInitialProps(appContext);

//   return { ...appProps }
// }

export default MyApp