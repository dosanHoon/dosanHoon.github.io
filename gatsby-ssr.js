'use strict';

const React = require('react');
const siteConfig = require('./config.js');

const PRETENDARD_CSS = 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

exports.onRenderBody = ({ setHeadComponents }) => {
  const headComponents = [
    React.createElement('link', {
      key: 'pretendard-preconnect',
      rel: 'preconnect',
      href: 'https://cdn.jsdelivr.net',
      crossOrigin: 'anonymous'
    }),
    React.createElement('link', {
      key: 'pretendard-css',
      rel: 'stylesheet',
      href: PRETENDARD_CSS
    })
  ];

  if (siteConfig.googleAnalyticsId) {
    headComponents.push(
      React.createElement('script', {
        key: 'gtag-js',
        async: true,
        src: `https://www.googletagmanager.com/gtag/js?id=${siteConfig.googleAnalyticsId}`
      }),
      React.createElement('script', {
        key: 'gtag-config',
        dangerouslySetInnerHTML: {
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('consent', 'default', {
              'analytics_storage': 'granted'
            });
            gtag('config', '${siteConfig.googleAnalyticsId}');
          `
        }
      })
    );
  }

  setHeadComponents(headComponents);
};
