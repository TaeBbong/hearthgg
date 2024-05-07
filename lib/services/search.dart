import '../env.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class SearchService {
  Future<Map<String, dynamic>> performSearch(
      {required String areaCode, required String id}) async {
    // String areaCode = areas[area]!;
    // String id = battleTagController.text;
    String searchParams = 'seasonid=45&area=$areaCode&accountid=$id';
    String searchUrl = Env.apiUrl + searchParams;

    var result = await http.get(Uri.parse(searchUrl));
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
