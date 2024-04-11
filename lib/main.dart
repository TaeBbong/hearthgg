import 'package:flutter/material.dart';

import 'screens/mobile_screen.dart';
import 'screens/desktop_screen.dart';
import 'screens/tablet_screen.dart';
import 'widgets/responsive_layout.dart';
import 'constants/theme.dart';

void main() {
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
        ),
      ),
    );
  }
}
