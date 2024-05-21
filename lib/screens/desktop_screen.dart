import 'package:firebase_analytics_web/firebase_analytics_web.dart';
import 'package:flutter/material.dart';

import '../services/search.dart';
import '../widgets/rank_card.dart';
import '../widgets/footer.dart';
import '../constants/area.dart';

class DesktopScreen extends StatefulWidget {
  final bool isDarkMode;
  final Function(bool) toggleTheme;
  final FirebaseAnalyticsWeb analytics;

  const DesktopScreen(
      {super.key,
      required this.isDarkMode,
      required this.toggleTheme,
      required this.analytics});

  @override
  _DesktopScreenState createState() => _DesktopScreenState();
}

class _DesktopScreenState extends State<DesktopScreen> {
  AreaLabel area = AreaLabel.ap;
  TextEditingController battleTagController = TextEditingController();
  SearchService service = SearchService();
  bool isSearching = false;
  bool isResult = false;
  Map<String, dynamic> searchResult = {'status': false};

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: InkWell(
          child: Text('Hearth.gg'),
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
          const Padding(
            padding: EdgeInsets.all(20.0),
          ),
          SizedBox(
            width: MediaQuery.of(context).size.width * 0.4,
            child: Row(
              children: <Widget>[
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButtonFormField<AreaLabel>(
                      value: area,
                      items: AreaLabel.values
                          .map<DropdownMenuItem<AreaLabel>>((AreaLabel value) {
                        return DropdownMenuItem<AreaLabel>(
                          value: value,
                          child: Text(
                            value.text,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        );
                      }).toList(),
                      onChanged: (AreaLabel? newValue) {
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
                      await widget.analytics.logEvent(
                          name:
                              '[+] Search Event with EnterKey ${battleTagController.text}');
                      setState(() {
                        isSearching = true;
                        searchResult = {'status': false};
                        isResult = false;
                      });
                      await service
                          .performSearch(
                              areaCode: area.code, id: battleTagController.text)
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
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.search),
                  onPressed: () async {
                    await widget.analytics.logEvent(
                        name:
                            '[+] Search Event with Button ${battleTagController.text}');
                    setState(() {
                      isSearching = true;
                      searchResult = {'status': false};
                      isResult = false;
                    });
                    await service
                        .performSearch(
                            areaCode: area.code, id: battleTagController.text)
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
              ],
            ),
          ),
          isSearching
              ? Container(
                  padding: const EdgeInsets.all(15),
                  height: 150,
                  width: 150,
                  child: const CircularProgressIndicator(
                    strokeWidth: 15,
                  ),
                )
              : isResult
                  ? SizedBox(
                      width: MediaQuery.of(context).size.width * 0.41,
                      child: RankCard(rankData: searchResult),
                    )
                  : Container(),
          Expanded(child: Container()),
          Footer(),
        ],
      ),
    );
  }
}
