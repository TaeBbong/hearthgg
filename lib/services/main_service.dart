import 'package:firebase_analytics_web/firebase_analytics_web.dart';
import 'package:get/get.dart';

class MainService extends GetxController {
  bool isDarkMode = false;
  final FirebaseAnalyticsWeb analytics = FirebaseAnalyticsWeb();
  Map<String, dynamic> seasons = {
    'arena': [44, 45, 46],
    'standard': [128],
  };

  void changeMode(bool mode) {
    isDarkMode = !isDarkMode;
    update();
  }
}
