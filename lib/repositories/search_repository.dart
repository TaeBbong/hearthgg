import 'package:firebase_storage/firebase_storage.dart';
import 'package:path/path.dart' as path;
import 'package:get/get.dart';

import '../env.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/retry.dart';

class SearchRepository extends GetxService {
  final client = RetryClient(
    http.Client(),
    retries: 5,
    when: (res) {
      return res.statusCode == 500 || res.statusCode == 503;
    },
  );

  Future<Map<String, dynamic>> fetchSeason({required String mode}) async {
    if (Env.runMode == RunMode.production) {
      String searchParams = 'mode=$mode';
      String searchUrl = Env.seasonUrl + searchParams;

      var result = await client.get(Uri.parse(searchUrl));
      var parsed = jsonDecode(result.body);

      if (parsed.containsKey("old")) {
        return {
          'status': true,
          'old': parsed['old'],
          'new': parsed['new'],
        };
      }
      return {'status': false};
    } else if (Env.runMode == RunMode.archive) {
      if (mode == 'arena') {
        return {'status': true, 'old': 46, 'new': 52};
      } else {
        return {'status': true, 'old': 128, 'new': 134};
      }
    } else {
      return {'status': false};
    }
  }

  Future<Map<String, dynamic>> fetchRank(
      {required Map<String, dynamic> searchParams, required String id}) async {
    Map<String, dynamic> parsedParams = {
      'mode': searchParams['mode'].code,
      'area': searchParams['area'].code,
      'season': searchParams['season'].toString(),
      'accountid': id,
    };

    if (Env.runMode == RunMode.production) {
      String queryString = Uri(queryParameters: parsedParams).query;
      String searchUrl = Env.apiUrl + queryString;

      var result = await client.get(Uri.parse(searchUrl));
      var parsed = jsonDecode(result.body);

      if (parsed.containsKey("rank")) {
        return {
          'status': true,
          'accountid': parsed['accountid'],
          'rank': parsed['rank'],
          'rating': parsed['rating']
        };
      }
      return {'status': false};
    } else if (Env.runMode == RunMode.archive) {
      String mode = parsedParams['mode'];
      String area = parsedParams['area'];
      String season = parsedParams['season'];
      String filePath = path.join('data', mode, season, '$area.json');
      String jsonString = '';
      final FirebaseStorage _storage = FirebaseStorage.instance;
      try {
        String downloadURL = await _storage.ref(filePath).getDownloadURL();
        final response = await http.get(Uri.parse(downloadURL));
        if (response.statusCode == 200) {
          jsonString = json.decode(response.body);
          List<dynamic> dataList = jsonDecode(jsonString);
          for (var data in dataList) {
            if (data['accountid'] == id) {
              return {
                'status': true,
                'accountid': id,
                'rank': data['rank'],
                'rating': data['rating']
              };
            }
          }
          return {'status': false, 'reason': 'No data found in json.'};
        } else {
          return {
            'status': false,
            'reason': 'Error while getting json file with url.'
          };
        }
      } catch (e) {
        print('Error reading JSON: $e');
        return {
          'status': false,
          'reason': 'Exception while get data from storage, $e'
        };
      }
    } else {
      return {'status': false};
    }
  }
}
