import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'package:get/get.dart';

import 'services/main_service.dart';
import 'bindings/initial_bindings.dart';
import 'firebase_options.dart';
import 'screens/mobile_screen.dart';
import 'screens/desktop_screen.dart';
import 'widgets/responsive_layout.dart';
import 'constants/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  usePathUrlStrategy();
  InitialBindings().dependencies();
  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return GetBuilder<MainService>(
      builder: (controller) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: controller.isDarkMode ? darkTheme : lightTheme,
          home: ResponsiveLayout(
            mobileLayout: MobileScreen(),
            tabletLayout: MobileScreen(),
            desktopLayout: DesktopScreen(),
          ),
        ).animate().fadeIn(
              duration: 400.ms,
            );
      },
    );
  }
}
