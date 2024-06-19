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
  }

  Future<Map<String, dynamic>> fetchRank(
      {required Map<String, dynamic> searchParams, required String id}) async {
    Map<String, dynamic> parsedParams = {
      'mode': searchParams['mode'].code,
      'area': searchParams['area'].code,
      'season': searchParams['season'].toString(),
      'accountid': id,
    };
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
  }
}
