import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';

import 'screens/home_screen.dart';
import 'screens/mobile_screen.dart';
import 'screens/desktop_screen.dart';
import 'screens/result_screen.dart';
import 'screens/tablet_screen.dart';
import 'widgets/responsive_layout.dart';
import 'constants/theme.dart';

void main() {
  setUrlStrategy(PathUrlStrategy());
  runApp(const MainApp());
}

class MainApp extends StatefulWidget {
  const MainApp({super.key});

  @override
  _MainAppState createState() => _MainAppState();
}

class _MainAppState extends State<MainApp> {
  bool _isDarkMode = false;

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
      initialRoute: '/',
      routes: {
        '/': (context) =>
            HomeScreen(isDarkMode: _isDarkMode, toggleTheme: toggleTheme),
        '/results': (context) => ResultScreen(),
      },
      // home: ResponsiveLayout(
      //   mobileLayout: MobileScreen(
      //     isDarkMode: _isDarkMode,
      //     toggleTheme: toggleTheme,
      //   ),
      //   tabletLayout: TabletScreen(
      //     isDarkMode: _isDarkMode,
      //     toggleTheme: toggleTheme,
      //   ),
      //   desktopLayout: DesktopScreen(
      //     isDarkMode: _isDarkMode,
      //     toggleTheme: toggleTheme,
      //   ),
      // ),
    );
  }
}
