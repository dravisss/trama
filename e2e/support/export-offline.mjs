// WebKit's network offline switch rejects file:// navigation before the
// document loads. Deny every HTTP(S) request there instead, so the export is
// still verified with zero network access. Other engines use native offline.
const networkPattern = /^https?:/;
export async function exportOffline(context, offline, browserName) {
 if(browserName === 'webkit') {
  if(offline) await context.route(networkPattern, route => route.abort('internetdisconnected'));
  else await context.unroute(networkPattern);
 } else await context.setOffline(offline);
}
