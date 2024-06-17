import 'dart:async';

import 'package:firebase_analytics_web/firebase_analytics_web.dart';
import 'package:get/get.dart';

import '../repositories/search_repository.dart';

class MainService extends GetxController {
  bool isDarkMode = false;
  final FirebaseAnalyticsWeb analytics = FirebaseAnalyticsWeb();
  Map<String, dynamic> seasons = {
    'arena': [44, 45],
    'standard': [128],
  };

  Future<Map<String, dynamic>> fetchSeason() async {
    final searchRepository = Get.find<SearchRepository>();
    List<String> modes = ['standard', 'arena'];
    Map<String, dynamic> results = {};
    for (var mode in modes) {
      var result = await searchRepository.fetchSeason(mode: mode);
      results[mode] = [for (var i = result['old']; i <= result['new']; i++) i];
    }
    return results;
  }

  void changeMode(bool mode) {
    isDarkMode = !isDarkMode;
    update();
  }
}
