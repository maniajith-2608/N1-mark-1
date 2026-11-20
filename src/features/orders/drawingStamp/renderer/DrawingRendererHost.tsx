import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type Ref,
} from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';
import { onRendererMessage, setRendererPage } from './renderDrawing';

type PageHandle = { postMessage: (message: string) => void };
type MessageEvent = { nativeEvent: { data: string } };

// The package's prop types collapse to `never` with this React Native's
// typings; just the props used here.
const WebView = RNWebView as unknown as ComponentType<{
  ref?: Ref<PageHandle>;
  source: { uri: string };
  originWhitelist: string[];
  javaScriptEnabled: boolean;
  allowFileAccess: boolean;
  onMessage: (event: MessageEvent) => void;
  onRenderProcessGone: () => void;
  style: StyleProp<ViewStyle>;
  testID: string;
}>;

/** Built by scripts/build-drawing-renderer.js into the app's assets. */
const PAGE = { uri: 'file:///android_asset/drawing-renderer/index.html' };

/**
 * The hidden WebView that draws PDF drawings on Android with the web
 * build's code (renderDrawing.ts sends it work). Mounted once, app-wide;
 * nothing on other platforms.
 */
export const DrawingRendererHost = memo(
  function DrawingRendererHostComponent() {
    const ref = useRef<PageHandle>(null);
    // A new key reloads the page after its process dies.
    const [generation, setGeneration] = useState(0);

    useEffect(() => () => setRendererPage(null), []);

    const onMessage = useCallback((event: MessageEvent) => {
      const { data } = event.nativeEvent;
      if (data.includes('"type":"ready"')) {
        setRendererPage(message => ref.current?.postMessage(message));
      }
      onRendererMessage(data);
    }, []);

    const restart = useCallback(() => {
      setRendererPage(null);
      setGeneration(g => g + 1);
    }, []);

    if (Platform.OS !== 'android') {
      return null;
    }
    return (
      <View style={styles.hidden} pointerEvents="none">
        <WebView
          key={generation}
          ref={ref}
          source={PAGE}
          originWhitelist={['*']}
          javaScriptEnabled
          allowFileAccess
          onMessage={onMessage}
          onRenderProcessGone={restart}
          style={styles.hidden}
          testID="drawing-renderer"
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
