import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:hearth_arena_rank_web/env.dart';
import 'package:hearth_arena_rank_web/widgets/card.dart';
import 'package:http/http.dart' as http;
import '../constants/area.dart';

class DesktopScreen extends StatefulWidget {
  final bool isDarkMode;
  final Function(bool) toggleTheme;

  const DesktopScreen(
      {super.key, required this.isDarkMode, required this.toggleTheme});

  @override
  _DesktopScreenState createState() => _DesktopScreenState();
}

class _DesktopScreenState extends State<DesktopScreen> {
  String area = '아시아태평양';
  TextEditingController battleTagController = TextEditingController();
  bool isSearching = false;
  bool isResult = false;
  Map<String, dynamic> searchResult = {'status': false};

  Future<Map<String, dynamic>> performSearch() async {
    String areaCode = areas[area]!;
    String id = battleTagController.text;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: InkWell(
          child: const Text('투기장 등수 검색 HearthGG.web.app'),
          onTap: () {},
        ),
        centerTitle: false,
        actions: [
          Switch(
            value: widget.isDarkMode,
            onChanged: widget.toggleTheme,
            activeColor: Colors.blue,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Image.asset('images/main.png', width: 240),
          ),
          SizedBox(
            width: MediaQuery.of(context).size.width * 0.4,
            child: Row(
              children: <Widget>[
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButtonFormField<String>(
                      value: area,
                      items: areas.keys
                          .map<DropdownMenuItem<String>>((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(value),
                        );
                      }).toList(),
                      onChanged: (String? newValue) {
                        setState(() {
                          area = newValue!;
                        });
                      },
                      isExpanded: true,
                      decoration: InputDecoration(
                        enabledBorder: OutlineInputBorder(
                          borderSide: BorderSide(color: Colors.grey, width: 1),
                        ),
                        border: OutlineInputBorder(),
                        filled: false,
                      ),
                    ),
                  ),
                ),
                SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    controller: battleTagController,
                    onFieldSubmitted: (_) async {
                      setState(() {
                        isSearching = true;
                        searchResult = {'status': false};
                        isResult = false;
                      });
                      await performSearch().then((result) {
                        setState(() {
                          isSearching = false;
                          if (result['status']) {
                            isResult = true;
                            searchResult = result;
                          }
                        });
                      });
                    },
                    decoration: InputDecoration(
                      hintText: '배틀태그를 입력하세요. (ex: Flurry)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.search),
                  onPressed: () async {
                    setState(() {
                      isSearching = true;
                      searchResult = {'status': false};
                      isResult = false;
                    });
                    await performSearch().then((result) {
                      setState(() {
                        isSearching = false;
                        if (result['status']) {
                          isResult = true;
                          searchResult = result;
                        }
                      });
                    });
                  },
                ),
              ],
            ),
          ),
          isSearching
              ? Container(
                  padding: EdgeInsets.all(15),
                  height: 150,
                  width: 150,
                  child: CircularProgressIndicator(
                    strokeWidth: 15,
                  ),
                )
              : isResult
                  ? SizedBox(
                      width: MediaQuery.of(context).size.width * 0.4,
                      child: RankCard(rankData: searchResult))
                  : Container(),
          Expanded(
              child: Container()), // Use expanded to push footer to the bottom
          Footer(),
        ],
      ),
    );
  }
}

class Footer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(20),
      color: Theme.of(context)
          .primaryColor
          .withOpacity(0.1), // Slight primary color tint
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'TaeBbong © 2024 My Website',
            style: TextStyle(
              fontSize: 16,
              color:
                  Theme.of(context).primaryColor, // Use primary color for text
            ),
          ),
        ],
      ),
    );
  }
}
