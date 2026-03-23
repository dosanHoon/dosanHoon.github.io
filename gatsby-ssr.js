'use strict';

const React = require('react');
const siteConfig = require('./config.js');

exports.onRenderBody = ({ setHeadComponents, setPostBodyComponents }) => {
  if (siteConfig.googleAnalyticsId) {
    setHeadComponents([
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
    ]);
  }
};
