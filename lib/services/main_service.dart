import 'package:firebase_analytics_web/firebase_analytics_web.dart';
import 'package:get/get.dart';

class MainService extends GetxController {
  bool isDarkMode = false;
  final FirebaseAnalyticsWeb analytics = FirebaseAnalyticsWeb();

  void changeMode(bool mode) {
    isDarkMode = !isDarkMode;

    update();
  }
}
