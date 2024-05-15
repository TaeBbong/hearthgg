import 'package:firebase_analytics_web/firebase_analytics_web.dart';
import 'package:flutter/material.dart';
import 'package:hearth_arena_rank_web/constants/area.dart';
import 'package:hearth_arena_rank_web/widgets/card.dart';

import '../widgets/footer.dart';
import '../services/search.dart';

class MobileScreen extends StatefulWidget {
  final bool isDarkMode;
  final Function(bool) toggleTheme;
  final FirebaseAnalyticsWeb analytics;

  const MobileScreen(
      {super.key,
      required this.isDarkMode,
      required this.toggleTheme,
      required this.analytics});

  @override
  _MobileScreenState createState() => _MobileScreenState();
}

class _MobileScreenState extends State<MobileScreen> {
  String area = '아시아태평양';
  TextEditingController battleTagController = TextEditingController();
  SearchService service = SearchService();
  bool isSearching = false;
  bool isResult = false;
  Map<String, dynamic> searchResult = {'status': false};

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('투기장 등수 검색 HearthGG.web.app'),
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
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Image.asset('images/main.png', width: 200),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        Expanded(
                          child: DropdownButtonHideUnderline(
                            child: DropdownButtonFormField<String>(
                              value: area,
                              items: areas.keys.map<DropdownMenuItem<String>>(
                                  (String value) {
                                return DropdownMenuItem<String>(
                                  value: value,
                                  child: Text(
                                    value,
                                    style: TextStyle(fontSize: 12),
                                  ),
                                );
                              }).toList(),
                              onChanged: (String? newValue) {
                                setState(() {
                                  area = newValue!;
                                });
                              },
                              itemHeight: 50,
                              isExpanded: true,
                              decoration: InputDecoration(
                                enabledBorder: OutlineInputBorder(
                                  borderSide:
                                      BorderSide(color: Colors.grey, width: 1),
                                ),
                                border: OutlineInputBorder(),
                                filled: false,
                              ),
                            ),
                          ),
                        ),
                        SizedBox(width: 1),
                        Expanded(
                          flex: 3,
                          child: TextFormField(
                            controller: battleTagController,
                            onFieldSubmitted: (_) async {
                              await widget.analytics.logEvent(
                                  name: '[+] Search Event with EnterKey');
                              setState(() {
                                isSearching = true;
                                searchResult = {'status': false};
                                isResult = false;
                              });
                              await service
                                  .performSearch(
                                      areaCode: areas[area]!,
                                      id: battleTagController.text)
                                  .then((result) {
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
                              hintStyle: TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.bold),
                              border: OutlineInputBorder(),
                              suffixIcon: IconButton(
                                icon: Icon(Icons.search),
                                onPressed: () async {
                                  await widget.analytics.logEvent(
                                      name: '[+] Search Event with Button');
                                  setState(() {
                                    isSearching = true;
                                    searchResult = {'status': false};
                                    isResult = false;
                                  });
                                  await service
                                      .performSearch(
                                          areaCode: areas[area]!,
                                          id: battleTagController.text)
                                      .then((result) {
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
                              contentPadding:
                                  EdgeInsets.fromLTRB(15, 22, 10, 22),
                            ),
                          ),
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
                              width: MediaQuery.of(context).size.width * 0.8,
                              child: RankCard(rankData: searchResult))
                          : Container(),
                ],
              ),
            ),
          ),
          Footer(),
        ],
      ),
    );
  }
}
