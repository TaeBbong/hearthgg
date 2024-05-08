import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_analytics_web/firebase_analytics_web.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';

import 'firebase_options.dart';
import 'screens/mobile_screen.dart';
import 'screens/desktop_screen.dart';

import 'screens/tablet_screen.dart';
import 'widgets/responsive_layout.dart';
import 'constants/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  usePathUrlStrategy();
  runApp(const MainApp());
}

class MainApp extends StatefulWidget {
  const MainApp({super.key});

  @override
  _MainAppState createState() => _MainAppState();
}

class _MainAppState extends State<MainApp> {
  bool _isDarkMode = false;

  static FirebaseAnalyticsWeb analytics = FirebaseAnalyticsWeb();

  void toggleTheme(bool isOn) {
    setState(() {
      _isDarkMode = isOn;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: _isDarkMode ? darkTheme : lightTheme,
      home: ResponsiveLayout(
        mobileLayout: MobileScreen(
          isDarkMode: _isDarkMode,
          toggleTheme: toggleTheme,
        ),
        tabletLayout: TabletScreen(
          isDarkMode: _isDarkMode,
          toggleTheme: toggleTheme,
        ),
        desktopLayout: DesktopScreen(
          isDarkMode: _isDarkMode,
          toggleTheme: toggleTheme,
          analytics: analytics,
        ),
      ),
    ).animate().fadeIn(
          duration: 400.ms,
        );
  }
}
